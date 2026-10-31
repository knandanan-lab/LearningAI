import { EAST_AFRICA, OTHER_AFRICA, WORK_FUNCTIONS, EXPERIENCE } from "@/lib/constants";

export default function ProfileFields({ form, set }) {
  return (
    <>
      <div>
        <label className="label" htmlFor="first_name">First name</label>
        <input id="first_name" className="field" required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} data-testid="profile-first-name-input" />
      </div>
      <div>
        <label className="label" htmlFor="country">Country</label>
        <select id="country" className="field" required value={form.country} onChange={(e) => set("country", e.target.value)} data-testid="profile-country-select">
          <option value="">Select your country</option>
          <optgroup label="East Africa">{EAST_AFRICA.map((c) => <option key={c}>{c}</option>)}</optgroup>
          <optgroup label="Rest of Africa">{OTHER_AFRICA.map((c) => <option key={c}>{c}</option>)}</optgroup>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="work_function">Work function or occupation</label>
        <select id="work_function" className="field" required value={form.work_function} onChange={(e) => set("work_function", e.target.value)} data-testid="profile-work-function-select">
          <option value="">Select one</option>
          {WORK_FUNCTIONS.map((w) => <option key={w}>{w}</option>)}
        </select>
      </div>
      <fieldset>
        <legend className="label">Your AI experience</legend>
        <div className="grid sm:grid-cols-3 gap-2">
          {EXPERIENCE.map((x) => (
            <label key={x} className={`card px-4 py-3 cursor-pointer text-sm flex items-center gap-2 ${form.ai_experience === x ? "!border-[var(--green)] bg-[var(--green-soft)]" : ""}`}>
              <input type="radio" name="ai_experience" value={x} required checked={form.ai_experience === x} onChange={() => set("ai_experience", x)} data-testid={`profile-experience-${x.toLowerCase().replace(/ /g, "-")}`} />
              {x}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
