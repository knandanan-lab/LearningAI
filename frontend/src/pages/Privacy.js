export default function Privacy() {
  return (
    <div className="max-w-2xl space-y-5 fade-in" data-testid="privacy-page">
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--green)]">Privacy notice</h1>
      <h2 className="text-lg font-semibold">What we store</h2>
      <p>To run your account, Learning AI Africa stores: your email address, a securely scrambled (hashed) password if you register with email, your first name, country, work function and AI experience level.</p>
      <p>To save your learning, we store which lessons you have completed and when, your answer to each quick-check question, your optional reflection (Yes, Maybe or Not yet) and any prompts you save to your favourites.</p>
      <h2 className="text-lg font-semibold">What we do not store</h2>
      <p>Prompts you edit in the app are not saved. If you choose the optional “Try it” or “Feedback on my prompt” feature, the prompt text is sent to an external AI provider (OpenAI, Anthropic or Google, depending on the model you choose) to generate a reply. The app does not keep a copy, but the provider processes it under its own terms.</p>
      <h2 className="text-lg font-semibold">Exercises and confidential information</h2>
      <p>Do not enter confidential business information, personal data or sensitive client information in any exercise or AI tool unless your organisation has approved its use. Use fictional or general details instead.</p>
      <h2 className="text-lg font-semibold">Questions about your data</h2>
      <p>If you have questions about your data, or would like it corrected or deleted, please contact the app administrator at Future Options Consulting Ltd. You can update your profile details at any time on the My profile page.</p>
    </div>
  );
}
