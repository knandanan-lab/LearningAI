export const EAST_AFRICA = [
  "Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi", "South Sudan",
  "Ethiopia", "Somalia", "Djibouti", "Eritrea", "Democratic Republic of the Congo",
];

export const OTHER_AFRICA = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Cabo Verde", "Cameroon",
  "Central African Republic", "Chad", "Comoros", "Côte d’Ivoire", "Egypt", "Equatorial Guinea",
  "Eswatini", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Lesotho", "Liberia", "Libya",
  "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia",
  "Niger", "Nigeria", "Republic of the Congo", "São Tomé and Príncipe", "Senegal", "Seychelles",
  "Sierra Leone", "South Africa", "Sudan", "Togo", "Tunisia", "Zambia", "Zimbabwe",
];

export const WORK_FUNCTIONS = [
  "Manager or supervisor", "HR or administration", "Sales or customer service",
  "Finance or operations", "NGO or public sector", "Small-business owner", "Other",
];

export const EXPERIENCE = ["Beginner", "Some experience", "Confident user"];

export const CATEGORIES = [
  { id: "write", name: "Write and communicate", icon: "PenLine" },
  { id: "meetings", name: "Prepare for meetings", icon: "CalendarClock" },
  { id: "plan", name: "Plan and organise work", icon: "ListChecks" },
  { id: "research", name: "Research and check information", icon: "Search" },
  { id: "solve", name: "Solve workplace problems", icon: "Lightbulb" },
  { id: "responsible", name: "Use AI responsibly", icon: "ShieldCheck" },
];

export const categoryName = (id) => CATEGORIES.find((c) => c.id === id)?.name || id;

export const SAFETY_TEXT =
  "Do not enter confidential business information, personal data or sensitive client information into an AI tool unless your organisation has approved its use.";
