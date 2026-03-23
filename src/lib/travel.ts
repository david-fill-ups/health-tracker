import travelData from "../../data/travel-recommendations.json";

interface DestinationData {
  required: string[];
  recommended: string[];
  notes: string[];
}

interface TravelSchedule {
  lastUpdated: string;
  source: string;
  disclaimer: string;
  destinations: Record<string, DestinationData>;
}

export interface TravelVaccine {
  name: string;
  covered: boolean;
}

export interface TravelCheckResult {
  destination: string;
  required: TravelVaccine[];
  recommended: TravelVaccine[];
  notes: string[];
  dataLastUpdated: string;
}

// Common city → country mappings for convenience
const CITY_TO_COUNTRY: Record<string, string> = {
  paris: "France",
  lyon: "France",
  marseille: "France",
  london: "United Kingdom",
  manchester: "United Kingdom",
  edinburgh: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  uk: "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  berlin: "Germany",
  munich: "Germany",
  frankfurt: "Germany",
  rome: "Italy",
  milan: "Italy",
  venice: "Italy",
  florence: "Italy",
  madrid: "Spain",
  barcelona: "Spain",
  lisbon: "Portugal",
  amsterdam: "Netherlands",
  "the netherlands": "Netherlands",
  brussels: "Belgium",
  zurich: "Switzerland",
  geneva: "Switzerland",
  vienna: "Austria",
  dublin: "Ireland",
  athens: "Greece",
  stockholm: "Sweden",
  oslo: "Norway",
  copenhagen: "Denmark",
  helsinki: "Finland",
  reykjavik: "Iceland",
  prague: "Czech Republic",
  "czech rep": "Czech Republic",
  czechia: "Czech Republic",
  warsaw: "Poland",
  budapest: "Hungary",
  bucharest: "Romania",
  zagreb: "Croatia",
  moscow: "Russia",
  "st. petersburg": "Russia",
  "saint petersburg": "Russia",
  "st petersburg": "Russia",
  istanbul: "Turkey",
  ankara: "Turkey",
  "tel aviv": "Israel",
  jerusalem: "Israel",
  amman: "Jordan",
  cairo: "Egypt",
  casablanca: "Morocco",
  marrakech: "Morocco",
  tunis: "Tunisia",
  dubai: "United Arab Emirates",
  "abu dhabi": "United Arab Emirates",
  uae: "United Arab Emirates",
  riyadh: "Saudi Arabia",
  mecca: "Saudi Arabia",
  medina: "Saudi Arabia",
  doha: "Qatar",
  tokyo: "Japan",
  osaka: "Japan",
  kyoto: "Japan",
  seoul: "South Korea",
  "south korea": "South Korea",
  korea: "South Korea",
  beijing: "China",
  shanghai: "China",
  "hong kong": "Hong Kong",
  taipei: "Taiwan",
  singapore: "Singapore",
  bangkok: "Thailand",
  "chiang mai": "Thailand",
  phuket: "Thailand",
  hanoi: "Vietnam",
  "ho chi minh": "Vietnam",
  "ho chi minh city": "Vietnam",
  saigon: "Vietnam",
  jakarta: "Indonesia",
  bali: "Indonesia",
  "kuala lumpur": "Malaysia",
  kl: "Malaysia",
  manila: "Philippines",
  "phnom penh": "Cambodia",
  "siem reap": "Cambodia",
  vientiane: "Laos",
  yangon: "Myanmar",
  rangoon: "Myanmar",
  "new delhi": "India",
  delhi: "India",
  mumbai: "India",
  bombay: "India",
  bangalore: "India",
  kolkata: "India",
  kathmandu: "Nepal",
  colombo: "Sri Lanka",
  karachi: "Pakistan",
  lahore: "Pakistan",
  islamabad: "Pakistan",
  dhaka: "Bangladesh",
  nairobi: "Kenya",
  "dar es salaam": "Tanzania",
  "cape town": "South Africa",
  johannesburg: "South Africa",
  "addis ababa": "Ethiopia",
  lagos: "Nigeria",
  accra: "Ghana",
  dakar: "Senegal",
  "mexico city": "Mexico",
  cancun: "Mexico",
  "rio de janeiro": "Brazil",
  "sao paulo": "Brazil",
  lima: "Peru",
  bogota: "Colombia",
  quito: "Ecuador",
  "la paz": "Bolivia",
  "buenos aires": "Argentina",
  santiago: "Chile",
  "san jose": "Costa Rica",
  "panama city": "Panama",
  havana: "Cuba",
  "santo domingo": "Dominican Republic",
  kingston: "Jamaica",
  nassau: "Bahamas",
  toronto: "Canada",
  vancouver: "Canada",
  montreal: "Canada",
  sydney: "Australia",
  melbourne: "Australia",
  "port moresby": "Papua New Guinea",
};

// Vaccine alias map — keys are canonical names used in the JSON
const VACCINE_ALIASES: Record<string, string[]> = {
  "Hepatitis A": ["hepatitis a", "hep a", "hep-a", "hepa", "havrix", "vaqta", "twinrix"],
  "Hepatitis B": ["hepatitis b", "hep b", "hep-b", "hepb", "hbv", "engerix", "recombivax", "twinrix"],
  "Yellow Fever": ["yellow fever", "yf", "yfv", "yf-vax", "stamaril"],
  Typhoid: ["typhoid", "typhoid fever", "ty21a", "vivotif", "typhim", "typherix"],
  "Japanese Encephalitis": ["japanese encephalitis", "je", "jev", "ixiaro", "je-vax"],
  Rabies: ["rabies", "imovax", "rabavert"],
  Meningococcal: ["meningococcal", "meningitis", "mcv4", "mpsv4", "menactra", "menveo", "nimenrix", "bexsero"],
  Cholera: ["cholera", "vaxchora"],
  Mpox: ["mpox", "monkeypox", "jynneos", "imvamune", "imvanex"],
};

const schedule = travelData as TravelSchedule;

export function findDestination(query: string): string | null {
  const q = query.toLowerCase().trim();

  // Check city aliases first
  const fromCity = CITY_TO_COUNTRY[q];
  if (fromCity) return fromCity;

  // Also check multi-word city aliases that contain the query
  for (const [city, country] of Object.entries(CITY_TO_COUNTRY)) {
    if (city === q || city.startsWith(q) || q.startsWith(city)) {
      return country;
    }
  }

  const keys = Object.keys(schedule.destinations);

  // Exact match (case-insensitive)
  const exact = keys.find((k) => k.toLowerCase() === q);
  if (exact) return exact;

  // Starts-with match
  const startsWith = keys.find((k) => k.toLowerCase().startsWith(q) || q.startsWith(k.toLowerCase()));
  if (startsWith) return startsWith;

  // Contains match
  return keys.find((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase())) ?? null;
}

function isVaccineCovered(vaccineName: string, userVaccineNames: string[]): boolean {
  const aliases = VACCINE_ALIASES[vaccineName] ?? [vaccineName.toLowerCase()];
  return userVaccineNames.some((userVax) => {
    const userLower = userVax.toLowerCase();
    return aliases.some((alias) => userLower.includes(alias) || alias.includes(userLower));
  });
}

export function getTravelVaccineStatus(
  destinationKey: string,
  userVaccinations: { name: string }[]
): TravelCheckResult {
  const dest = schedule.destinations[destinationKey];
  const userNames = userVaccinations.map((v) => v.name);

  return {
    destination: destinationKey,
    required: dest.required.map((name) => ({
      name,
      covered: isVaccineCovered(name, userNames),
    })),
    recommended: dest.recommended.map((name) => ({
      name,
      covered: isVaccineCovered(name, userNames),
    })),
    notes: dest.notes,
    dataLastUpdated: schedule.lastUpdated,
  };
}
