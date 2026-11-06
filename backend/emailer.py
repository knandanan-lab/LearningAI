import os
import re
import asyncio
import ipaddress
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

from fastapi import HTTPException

logger = logging.getLogger(__name__)

DEFAULT_SMTP_HOST = "sandbox.smtp.mailtrap.io"
SMTP_PORT = 587

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


def _brand() -> str:
    return os.environ.get("EMAIL_FROM_NAME") or "Learning AI Africa"


async def send_email(*, to: str, subject: str, html: str) -> str | None:
    _assert_safe_email(subject, html)
    if not os.environ.get("MAILTRAP_USERNAME"):
        # Email is optional: without SMTP credentials, skip sending. Don't log the body (it may hold reset links).
        logger.info(f"Email not configured (MAILTRAP_USERNAME unset); skipped sending {subject!r}")
        return None
    from_addr = os.environ["EMAIL_FROM_ADDRESS"]
    msg = EmailMessage()
    msg["From"] = formataddr((_brand(), from_addr))
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=from_addr.rsplit("@", 1)[-1])
    if os.environ.get("EMAIL_REPLY_TO"):
        msg["Reply-To"] = os.environ["EMAIL_REPLY_TO"]
    msg.set_content("This email needs an HTML-capable email client to display.")
    msg.add_alternative(html, subtype="html")

    def _send():
        host = os.environ.get("MAILTRAP_HOST") or DEFAULT_SMTP_HOST
        with smtplib.SMTP(host, SMTP_PORT, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(os.environ["MAILTRAP_USERNAME"], os.environ["MAILTRAP_PASSWORD"])
            smtp.send_message(msg)

    try:
        # smtplib is blocking; run it in a thread so it doesn't block the event loop.
        await asyncio.to_thread(_send)
        return msg["Message-ID"]
    except smtplib.SMTPResponseException as e:
        # 4xx SMTP codes are temporary (e.g. rate limits); 5xx are permanent failures.
        if 400 <= e.smtp_code < 500:
            logger.warning(f"Email paused: SMTP {e.smtp_code}: {e.smtp_error!r}")
            raise HTTPException(503, "Email is temporarily unavailable")
        logger.error(f"Email send failed: SMTP {e.smtp_code}: {e.smtp_error!r}")
        raise HTTPException(502, "Failed to send email")
    except (smtplib.SMTPException, OSError):
        logger.exception("Email send failed")
        raise HTTPException(502, "Failed to send email")


def _button(link: str, label: str) -> str:
    return (f'<p style="margin:24px 0"><a href="{escape(link, quote=True)}" style="background:#0e4459;color:#ffffff;'
            f'padding:12px 22px;border-radius:999px;text-decoration:none;display:inline-block">{label}</a></p>')


def verify_email_html(link: str) -> str:
    brand = escape(_brand())
    return (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#14211c">'
        f'<h2 style="color:#0e4459;margin:0 0 16px">Confirm your {brand} email address</h2>'
        "<p>Please confirm your email address to use the in-app AI practice tools. This link expires in 24 hours.</p>"
        + _button(link, "Confirm my email") +
        "<p>If you did not create an account, you can ignore this email.</p>"
        f'<p style="font-size:12px;color:#888">Sent by {brand} - A Future Options learning initiative. '
        "We never ask for your password by email.</p></td></tr></table>"
    )


def welcome_email_html(first_name: str, link: str, verify_link: str | None = None) -> str:
    brand = escape(_brand())
    name = escape(first_name or "there")
    safe = escape(link, quote=True)
    confirm = ("<p><strong>Please confirm your email address</strong> to use the in-app AI practice tools "
               "(link valid for 24 hours):</p>" + _button(verify_link, "Confirm my email")) if verify_link else ""
    return (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#14211c">'
        f'<h2 style="color:#0e4459;margin:0 0 16px">Welcome to {brand}, {name}</h2>'
        "<p>Make AI work for your work. Learn one practical AI skill in 15 minutes a day and use it to make "
        "everyday work easier.</p>"
        "<p>Your first lesson, <strong>Day 1: Meet your AI assistant</strong>, helps you choose a suitable "
        "everyday task for AI. Learn at your own pace; you do not need to learn every day.</p>"
        + confirm +
        f'<p style="margin:24px 0"><a href="{safe}" style="background:#0e4459;color:#ffffff;padding:12px 22px;'
        'border-radius:999px;text-decoration:none;display:inline-block">Start Day 1</a></p>'
        "<p>Remember: do not enter confidential business information, personal data or sensitive client "
        "information into an AI tool unless your organisation has approved its use.</p>"
        f'<p style="font-size:12px;color:#888">Sent by {brand} - A Future Options learning initiative. '
        "We never ask for your password by email.</p></td></tr></table>"
    )


def reset_email_html(link: str) -> str:
    brand = escape(_brand())
    safe = escape(link, quote=True)
    return (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#14211c">'
        f'<h2 style="color:#0e4459;margin:0 0 16px">Reset your {brand} password</h2>'
        "<p>We received a request to reset the password for your account. This link works once and expires in one hour.</p>"
        f'<p style="margin:24px 0"><a href="{safe}" style="background:#0e4459;color:#ffffff;padding:12px 22px;'
        'border-radius:999px;text-decoration:none;display:inline-block">Choose a new password</a></p>'
        "<p>If you did not request this, you can ignore this email. Your password will not change.</p>"
        f'<p style="font-size:12px;color:#888">Sent by {brand} - A Future Options learning initiative. '
        "We never ask for your password by email.</p></td></tr></table>"
    )
