import { useMemo, useState } from "react";
import { Search, AlertTriangle, ArrowLeft, ExternalLink, Info } from "lucide-react";
import categoryStats from "./data/categoryStats.json";
import searchAliases from "./data/searchAliases.json";

/*
  LeadCheck — consumer prototype for the open lead-in-products database.
  Demonstration dataset only: a small set of well-documented public findings,
  each carrying its source. The real data comes from lead_db_ingest.py
  (NYC DOHMH + Pure Earth RMS + CPSC + FDA). See lead-database-plan.md.

  Design rules embodied here:
   - "Not listed" is an UNKNOWN state, never an all-clear.
   - Every value carries a basis stamp (total / leach / screening / recall);
     bases are never compared to each other.
   - Category-first: sparse product coverage must not falsely reassure.
   - Aliases include the words at-risk communities actually search.
*/

const BASIS = {
  total: { label: "TOTAL CONTENT", hint: "How much lead is in the material itself" },
  leach: { label: "LEACH TEST", hint: "How much lead comes out into food or drink" },
  surface: { label: "SURFACE LOADING", hint: "Lead per unit area on a painted or coated surface (XRF)" },
  screen: { label: "MARKET SCREENING", hint: "Rapid XRF survey of items bought in markets" },
  recall: { label: "RECALL", hint: "Product pulled by regulators; amount not always published" },
  info: { label: "BACKGROUND", hint: "Established fact or standing rule" },
};

const CATEGORIES = [
  {
    id: "spices",
    name: "Spices & food colorings",
    examples: "turmeric, cinnamon, chili powder, curry, masala mixes",
    aliases: ["turmeric", "haldi", "holud", "cinnamon", "curry", "masala", "chili powder", "paprika", "saffron", "spice"],
    riskLine:
      "A repeat offender in poisoning investigations. Lead chromate is sometimes added to loose spices to make the color brighter — especially turmeric and chili.",
    redFlags: [
      "Loose spices from open bins or carried home from abroad",
      "Unusually bright, vivid yellow or orange color",
      "No brand, no ingredient label, or unfamiliar packaging",
    ],
    doNow: [
      "Prefer sealed, branded spices from large retailers",
      "If a spice looks unusually vivid and came from a market abroad, stop using it",
      "Bangladesh cut turmeric adulteration to near zero after a 2019 crackdown — this problem is fixable",
    ],
  },
  {
    id: "food",
    name: "Food & candy",
    examples: "imported candies, dried fruit snacks, tea, flour",
    aliases: ["candy", "tamarind", "chili candy", "dulces", "sweets", "snack", "tea"],
    riskLine:
      "Most packaged food is fine. The documented problems cluster in certain imported candies (chili, tamarind) and in foods made with contaminated ingredients.",
    redFlags: [
      "Imported chili or tamarind candies without clear labeling",
      "Products already named in an FDA recall",
    ],
    doNow: [
      "Check FDA recalls if a product seems off",
      "Variety is protective: rotating foods limits any single source",
    ],
  },
  {
    id: "babyfood",
    name: "Baby & toddler food",
    examples: "purees, pouches, infant cereals, teething snacks",
    aliases: ["baby food", "puree", "pouch", "infant cereal", "toddler", "applesauce"],
    riskLine:
      "Very low levels are common across the market because crops pick up metals from soil; dangerous levels are rare and usually trace back to one contaminated ingredient.",
    redFlags: [
      "A product named in a recall — take those seriously and act fast",
      "Heavy reliance on a single food, especially root vegetables or rice-based products",
    ],
    doNow: [
      "Serve a variety of foods and brands",
      "US action levels (2025): 10 ppb for most baby foods, 20 ppb for root vegetables and dry infant cereal",
      "If your child ate a recalled product, ask their doctor about a blood lead test",
    ],
  },
  {
    id: "cookware",
    name: "Pots, pans & metal cookware",
    examples: "aluminum pots, pressure cookers, brass vessels, kettles",
    aliases: ["pot", "pan", "aluminum", "aluminium", "pressure cooker", "kettle", "brass", "degchi", "handi", "cookware"],
    riskLine:
      "Locally made aluminum cookware in many countries is often cast from scrap that includes lead, which can leach into food during cooking.",
    redFlags: [
      "Hand-cast or artisanal aluminum pots, especially bought abroad",
      "Soft, dull-gray metal that scratches or pits easily",
      "Brass or bronze vessels used with acidic foods",
    ],
    doNow: [
      "For daily cooking, prefer stainless steel, cast iron, or branded anodized aluminum",
      "Keep artisanal metal vessels for display rather than acidic or long-simmered foods",
    ],
  },
  {
    id: "ceramics",
    name: "Plates, ceramics & crystal",
    examples: "glazed pottery, mugs, vintage dishes, lead crystal",
    aliases: ["plate", "mug", "bowl", "dish", "pottery", "barro", "ceramic", "glaze", "crystal", "china", "earthenware"],
    riskLine:
      "The glaze is the issue: traditional low-fire glazes and many vintage decorations contain lead that can leach into food — most with acidic food and drink, heat, and daily use.",
    redFlags: [
      "Handmade or traditional glazed pottery used for cooking or storing food",
      "Vintage or antique decorated dishware in daily rotation",
      "Items marked 'for decorative use only'",
      "Corroded or chalky glaze, or color that wipes off",
    ],
    doNow: [
      "Keep suspect pieces decorative; don't cook, store, or serve acidic food in them",
      "Don't store juice, wine, or vinegar in lead crystal (short serving use is lower risk)",
      "Modern dishware from major manufacturers is made to pass leach limits",
    ],
  },
  {
    id: "toys",
    name: "Toys & children's items",
    examples: "painted toys, crayons, chalk, playsets",
    aliases: ["toy", "doll", "crayon", "chalk", "playset", "blocks"],
    riskLine:
      "US law has tightened lead in children's products in steps: the 90 ppm paint limit took effect in 2009 and the strict 100 ppm total-content limit in August 2011. Mainstream toys are usually compliant. The gaps are older toys, hand-me-downs, and direct-shipped imports that skip testing.",
    redFlags: [
      "Toys made before 2011 (especially pre-2009), or handed down with unknown history",
      "Cheap painted metal or vinyl items from unfamiliar sellers online",
      "Peeling or chipping paint on any child's item",
    ],
    doNow: [
      "Check CPSC recalls before buying secondhand",
      "US limits: 100 ppm total lead; 90 ppm in paint and coatings",
    ],
  },
  {
    id: "jewelry",
    name: "Jewelry & accessories",
    examples: "kids' jewelry, charms, amulets, keys",
    aliases: ["jewelry", "jewellery", "necklace", "bracelet", "charm", "pendant", "amulet", "taviz", "keychain", "keys"],
    riskLine:
      "Cheap metal jewelry has one of the worst track records of any product type — lead makes castings heavy and cheap. The danger is children mouthing or swallowing pieces.",
    redFlags: [
      "Inexpensive metal jewelry sold for or worn by children",
      "Vending-machine or party-favor jewelry",
      "Heavy-for-its-size metal charms and amulets",
    ],
    doNow: [
      "Keep metal jewelry away from young children entirely — swallowing one leaded charm can be a medical emergency",
      "If a child swallows jewelry, seek care immediately and mention lead",
    ],
  },
  {
    id: "cosmetics",
    name: "Cosmetics & ceremonial powders",
    examples: "kohl, surma, kajal, sindoor, kumkum, tiro",
    aliases: ["kohl", "surma", "kajal", "kajol", "sindoor", "kumkum", "tiro", "kwalli", "eyeliner", "vermilion", "henna"],
    riskLine:
      "Traditional eye cosmetics and some ceremonial powders are among the highest-lead products ever tested — some are made from lead minerals themselves.",
    redFlags: [
      "Traditional kohl/surma/kajal/tiro, especially products brought from abroad",
      "Sindoor or vermilion powder with an unusually deep orange-red color",
      "Use on infants and children, including 'for protection' on newborns",
    ],
    doNow: [
      "Never apply traditional kohl or surma to a child",
      "Safer alternatives exist: commercially made, regulated eyeliners and synthetic sindoor",
      "The problem is adulteration and old formulations, not the tradition itself",
    ],
  },
  {
    id: "remedies",
    name: "Home remedies & supplements",
    examples: "azarcon, greta, some traditional metal-ash medicines",
    aliases: ["azarcon", "greta", "empacho", "remedy", "ayurvedic", "rasa shastra", "supplement", "herbal", "medicine"],
    riskLine:
      "A small set of traditional remedies are lead compounds outright, and surveys of some traditional medicine markets keep finding heavy metals in a meaningful share of products.",
    redFlags: [
      "Azarcon or greta given for stomach ailments (empacho) — these are lead salts",
      "Bright orange, yellow, or metallic powders sold as medicine",
      "Any remedy given to a child that isn't from a regulated pharmacy",
    ],
    doNow: [
      "Stop azarcon/greta immediately and tell a doctor it was used — there is no safe amount",
      "If a remedy has been used regularly, ask about a blood lead test",
      "Talk to a clinician who respects the tradition; safer preparations often exist",
    ],
  },
  {
    id: "paint",
    name: "Paint & older homes",
    examples: "pre-1978 US housing, imported paints, dust from renovation",
    aliases: ["paint", "wall", "house", "dust", "renovation", "window", "pre-1978"],
    riskLine:
      "Old paint is still the biggest US source of childhood lead poisoning — through dust from chipping, friction surfaces, and renovation, not just eaten chips. Abroad, leaded house paint is still sold in many countries.",
    redFlags: [
      "US home built before 1978 with chipping paint or sticking windows",
      "DIY sanding or scraping of old paint",
      "Bright industrial paints bought in countries without enforced limits",
    ],
    doNow: [
      "Wet-wipe sills and floors; don't dry-sand old paint",
      "Use certified lead-safe contractors for renovation (US: EPA RRP)",
      "US EPA lead hotline and epa.gov/lead cover testing and safe practices",
    ],
  },
];

const RECORDS = [
  {
    id: 1, cat: "spices", finding: "found", basis: "total",
    title: "Cinnamon inside recalled apple-cinnamon pouches",
    value: "2,270–5,110", unit: "ppm",
    vs: "There is no US limit for lead in spices. For scale, FDA's baby-food action level is 0.010 ppm.",
    source: "FDA investigation", year: "2023–24", place: "USA (product of Ecuador)",
    note: "Lead chromate added to cinnamon for color; the pouches themselves tested around 2 ppm. Hundreds of US children were affected before the recall.",
    url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
  },
  {
    id: 2, cat: "spices", finding: "found", basis: "total",
    title: "Ground cinnamon on US store shelves",
    value: "2.0–7.7", unit: "ppm",
    vs: "No US spice limit exists; FDA recalled these case-by-case.",
    source: "FDA retail testing", year: "2024–25", place: "USA",
    note: "Follow-up shelf testing after the pouch outbreak flagged 16+ distributor brands (lead ~2.03–7.68 ppm) for recall.",
    url: "https://www.fda.gov/food/alerts-advisories-safety-information/fda-alert-concerning-certain-cinnamon-products-due-presence-elevated-levels-lead",
  },
  {
    id: 3, cat: "spices", finding: "found", basis: "total",
    title: "Loose turmeric in Bangladesh markets (pre-2019)",
    value: "up to ~1,100", unit: "ppm",
    vs: "Any detectable added lead is unacceptable in food.",
    source: "Stanford / icddr,b research", year: "2014–19", place: "Bangladesh",
    note: "Lead chromate was added for color; found across major markets. After a government crackdown, adulteration fell to near zero — proof this is fixable.",
    url: "https://doi.org/10.1016/j.envres.2019.108722",
  },
  {
    id: 4, cat: "spices", finding: "found", basis: "total",
    title: "Spices carried home from abroad (NYC casework)",
    value: "up to thousands", unit: "ppm",
    vs: "Individual investigation samples; not a market average.",
    source: "NYC Health Department", year: "ongoing", place: "New York City",
    note: "Loose, vividly colored spices bought abroad are the repeat pattern in NYC's lead-poisoning investigations.",
    url: "https://data.cityofnewyork.us/Health/Metal-Content-of-Consumer-Products-Tested-by-the-N/da9u-wz3r",
  },
  {
    id: 5, cat: "cosmetics", finding: "found", basis: "total",
    title: "Kohl / surma / kajal / tiro (traditional eye cosmetics)",
    value: "up to ~73–83%", unit: "lead by weight",
    vs: "The US bans lead-based kohl from import outright.",
    source: "FDA import alerts; NYC casework", year: "ongoing", place: "worldwide",
    note: "Many traditional preparations are ground galena — a lead mineral. Applied around children's eyes, transfer to hands and mouth is direct.",
    url: "https://data.cityofnewyork.us/Health/Metal-Content-of-Consumer-Products-Tested-by-the-N/da9u-wz3r",
  },
  {
    id: 6, cat: "cosmetics", finding: "found", basis: "total",
    title: "Sindoor / vermilion powder (some samples)",
    value: "some mostly lead", unit: "",
    vs: "Safe synthetic sindoor exists and looks the same.",
    source: "NYC / CDC case reports", year: "ongoing", place: "USA & South Asia",
    note: "Some samples are adulterated with lead tetroxide for the deep red-orange color. Products labeled 'for religious use only' still end up on skin.",
    url: "https://data.cityofnewyork.us/Health/Metal-Content-of-Consumer-Products-Tested-by-the-N/da9u-wz3r",
  },
  {
    id: 7, cat: "remedies", finding: "found", basis: "total",
    title: "Azarcon and greta (empacho remedies)",
    value: "≈70–90%", unit: "lead",
    vs: "These powders are lead compounds. There is no safe dose.",
    source: "CDC case investigations", year: "long documented", place: "USA & Mexico",
    note: "Orange (azarcon) and yellow (greta) powders given for stomach ailments. If a child has taken these, tell a doctor right away.",
    url: "https://www.cdc.gov/lead-prevention/prevention/foods-cosmetics-medicines.html",
  },
  {
    id: 8, cat: "remedies", finding: "found", basis: "total",
    title: "Some traditional metal-ash medicines (surveys)",
    value: "~1 in 5", unit: "products flagged",
    vs: "Published market surveys, not a verdict on any tradition.",
    source: "Peer-reviewed surveys (JAMA)", year: "2004–08", place: "US & online markets",
    note: "Surveys of purchased traditional medicines found lead, mercury, or arsenic in roughly one in five sampled products, concentrated in metal-ash (rasa shastra) preparations.",
    url: "https://doi.org/10.1001/jama.300.8.915",
  },
  {
    id: 9, cat: "cookware", finding: "found", basis: "screen",
    title: "Metal foodware, 25-country market study",
    value: "51%", unit: "of samples over 100 ppm",
    vs: "Screening reference: 100 ppm total lead for foodware.",
    source: "Pure Earth Rapid Market Screening", year: "2022–23", place: "25 countries",
    note: "51% of 520 metal foodware samples exceeded 100 ppm — the worst category in the study. Aluminum pots cast from scrap were the most common offender; brass and other metals were also implicated.",
    url: "https://zenodo.org/records/10444602",
  },
  {
    id: 10, cat: "ceramics", finding: "found", basis: "screen",
    title: "Ceramic foodware, 25-country market study",
    value: "45%", unit: "of samples over 100 ppm",
    vs: "Screening reference: 100 ppm total lead.",
    source: "Pure Earth Rapid Market Screening", year: "2022–23", place: "25 countries",
    note: "Traditional glazes are the main source. Total content and leaching are different measurements — but glazes this leaded routinely fail leach tests too.",
    url: "https://zenodo.org/records/10444602",
  },
  {
    id: 11, cat: "ceramics", finding: "found", basis: "leach",
    title: "Traditional low-fire glazed pottery used for cooking",
    value: "far above", unit: "FDA leach limits",
    vs: "US leach limit for cups & mugs: 0.5 µg/mL.",
    source: "Public health investigations", year: "long documented", place: "Mexico & USA",
    note: "Low-fire traditional glazes release lead into acidic and hot foods. A major driver of elevated blood lead where these pots are daily cookware.",
    url: "https://www.epa.gov/lead",
  },
  {
    id: 12, cat: "ceramics", finding: "info", basis: "info",
    title: "Lead crystal and vintage decorated dishware",
    value: "~24%", unit: "lead oxide in true crystal",
    vs: "By design — that's what makes crystal sparkle.",
    source: "Established materials fact", year: "", place: "",
    note: "Occasional serving use is lower risk; storing wine, juice, or vinegar in crystal is not. Vintage glaze decorations frequently test high — keep heirlooms decorative.",
    url: "https://www.epa.gov/lead",
  },
  {
    id: 13, cat: "jewelry", finding: "found", basis: "recall",
    title: "Inexpensive metal children's jewelry",
    value: "≈150 million", unit: "pieces recalled (2004)",
    vs: "US limit today: 100 ppm total lead in children's products.",
    source: "CPSC recalls", year: "2004–present", place: "USA",
    note: "In 2006 a child died after swallowing a leaded metal charm. Cheap castings still surface through imports — treat heavy little charms as hazards for small children.",
    url: "https://www.cpsc.gov/Recalls",
  },
  {
    id: 14, cat: "toys", finding: "info", basis: "info",
    title: "US children's product limits (phased in 2009–2011)",
    value: "100 / 90", unit: "ppm limits (material / paint)",
    vs: "Set by the Consumer Product Safety Improvement Act (2008).",
    source: "US CPSIA", year: "100 ppm since Aug 2011", place: "USA",
    note: "CPSIA passed in 2008, but the 100 ppm total-lead limit phased in (600→300→100 ppm) and took full effect Aug 14, 2011; the 90 ppm paint limit began Aug 2009. Toys made 2008–2011 could legally exceed today's cap. The gaps: older toys, hand-me-downs, and direct-shipped imports that skip testing.",
    url: "https://www.cpsc.gov/Business--Manufacturing/Business-Education/Lead/Total-Lead-Content",
  },
  {
    id: 15, cat: "babyfood", finding: "found", basis: "total",
    title: "Packaged baby foods, US market surveys",
    value: "low levels common", unit: "high levels rare",
    vs: "US action levels (2025): 10 ppb most foods; 20 ppb root vegetables & dry infant cereal.",
    source: "FDA & independent surveys", year: "2019–25", place: "USA",
    note: "Trace metals come from soil into crops. Variety across foods and brands is the practical protection; recalls are the exception, not the rule.",
    url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
  },
  {
    id: 16, cat: "paint", finding: "found", basis: "screen",
    title: "House paints, 25-country market study",
    value: "41%", unit: "of samples over 90 ppm",
    vs: "90 ppm is the widely adopted modern paint limit.",
    source: "Pure Earth Rapid Market Screening", year: "2022–23", place: "25 countries",
    note: "Leaded decorative paint is still openly sold in many countries. If you're painting a home abroad, ask for certified low-lead paint by name.",
    url: "https://zenodo.org/records/10444602",
  },
  {
    id: 17, cat: "food", finding: "found", basis: "recall",
    title: "Imported chili & tamarind candies",
    value: "repeat recalls", unit: "over many years",
    vs: "FDA guidance for candy: 0.1 ppm.",
    source: "FDA recalls", year: "1990s–present", place: "USA",
    note: "Contamination has come through chili powder, tamarind, and even ink on wrappers. Branded, sealed products from large retailers have the better record.",
    url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
  },
];

const FINDING_STYLE = {
  found: "bg-amber-100 text-amber-900 border-amber-300",
  // Deliberately NOT green: one non-detect on one sample is not an all-clear.
  // "none" is the pipeline's word; "nondetect" the demo's — treat identically.
  nondetect: "bg-slate-100 text-slate-700 border-slate-300",
  none: "bg-slate-100 text-slate-700 border-slate-300",
  unknown: "bg-slate-100 text-slate-600 border-slate-300",
  info: "bg-slate-100 text-slate-700 border-slate-300",
};
const FINDING_TEXT = {
  found: "Lead found",
  nondetect: "None detected in this sample",
  none: "None detected in this sample",
  unknown: "Untested",
  info: "Background",
};
// Shown under a non-detect card so a single clean sample never reads as a pass.
const NONDETECT_CAVEAT =
  "One sample tested below the detection limit. That is not a clearance for the product or brand — coverage is sparse and lead is often uneven within a batch.";

function BasisChip({ basis }) {
  const b = BASIS[basis];
  if (!b) return null;
  return (
    <span
      title={b.hint}
      className="inline-block border border-slate-400 text-slate-600 font-mono text-[10px] tracking-widest px-1.5 py-0.5 rounded-sm align-middle"
    >
      {b.label}
    </span>
  );
}

// Real per-category counts from the pipeline (lead_products.sqlite), exported
// by export_app_data.py. Source-separated on purpose: screening, investigation,
// and recall counts are NEVER pooled into one "prevalence" number.
function CategoryStats({ stats }) {
  if (!stats) return null;
  const { screening: s, investigation: inv, recalls: rec } = stats;
  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-md p-4">
      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">By the numbers</h3>
      <p className="text-xs text-slate-500 mt-1">
        From aggregated public testing. These are{" "}
        <span className="font-semibold">not</span> figures for how common lead is
        in what you'd buy — read each line's note.
      </p>
      <ul className="mt-3 space-y-3 text-sm text-slate-700">
        {s && (
          <li>
            <span className="font-medium">Market screening (Pure Earth, 25 countries):</span>{" "}
            lead detected in {s.detected} of {s.samples} samples
            {typeof s.above_reference === "number"
              ? `, ${s.above_reference} above the 100 ppm screening reference`
              : ""}.
            <span className="block text-xs text-slate-500 mt-0.5">
              A snapshot of goods on sale across many markets — not a verdict on any brand, and lead is often uneven from batch to batch.
            </span>
          </li>
        )}
        {inv && (
          <li>
            <span className="font-medium">Investigation testing (NYC Health Dept.):</span>{" "}
            lead found in {inv.detected} of {inv.samples} products tested.
            <span className="block text-xs text-slate-500 mt-0.5">
              Collected during lead-poisoning investigations — targeted samples, so a high rate is expected here and is not a market rate.
            </span>
          </li>
        )}
        {rec && (
          <li>
            <span className="font-medium">Recalls (CPSC / FDA):</span>{" "}
            {rec} product recall{rec === 1 ? "" : "s"} for lead recorded in this category.
          </li>
        )}
      </ul>
    </div>
  );
}

function RecordCard({ r }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${FINDING_STYLE[r.finding] || FINDING_STYLE.info}`}>
          {FINDING_TEXT[r.finding] || "Result unclear"}
        </span>
        <BasisChip basis={r.basis} />
        <span className="text-xs text-slate-500 ml-auto">
          {r.source}{r.year ? ` · ${r.year}` : ""}
        </span>
      </div>
      <h4 className="text-slate-900 font-medium leading-snug">{r.title}</h4>
      <div className="mt-2 font-mono text-lg text-slate-900">
        {r.value} <span className="text-sm text-slate-500">{r.unit}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600">{r.vs}</p>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{r.note}</p>
      {(r.finding === "nondetect" || r.finding === "none") && (
        <p className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
          {NONDETECT_CAVEAT}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{r.place}</span>
        <a
          href={r.url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 text-teal-800 hover:text-teal-900 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 rounded-sm"
        >
          source <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

function UnknownState({ query }) {
  return (
    <div className="border-2 border-dashed border-slate-300 bg-white rounded-md p-6 text-center">
      <p className="font-serif text-xl text-slate-900">
        No test results for “{query}”.
      </p>
      <p className="mt-2 text-slate-700 max-w-xl mx-auto">
        <span className="font-semibold">That does not mean it's safe.</span>{" "}
        Most products have never been tested for lead — absence from this
        database is an unknown, not an all-clear. Browse the category that
        fits your item for what testing has found in things like it.
      </p>
    </div>
  );
}

function WhatToDo() {
  return (
    <div className="bg-teal-900 text-teal-50 rounded-md p-5 sm:p-6">
      <h3 className="font-serif text-lg">If you're worried about a specific item</h3>
      <ol className="mt-3 space-y-2 text-sm leading-relaxed list-decimal list-inside">
        <li>Stop using it for food, and keep it away from children — you don't need certainty to be careful.</li>
        <li>Don't panic. Lead risk builds with repeated use; one exposure is a reason to act, not to despair.</li>
        <li>For children under 6 and anyone pregnant: ask the doctor about a blood lead test. It's a simple blood draw.</li>
        <li>
          Report and ask: products at{" "}
          <a href="https://www.saferproducts.gov" target="_blank" rel="noreferrer" className="underline underline-offset-2">SaferProducts.gov</a>
          {" "}· questions to Poison Help, 1-800-222-1222 (US, free, 24/7).
        </li>
      </ol>
    </div>
  );
}

export default function LeadCheck() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState({ type: "home" });

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return { records: [], categories: [], aliasNotes: [] };
    // Whole-token / prefix matching, never bidirectional substring: "haldi"
    // matches the alias "haldi", but "potato" must not match "pot" and a
    // 1–2 char query must not match everything.
    const tokens = q.split(/[\s,/&()-]+/).filter((t) => t.length >= 3);
    if (tokens.length === 0) return { records: [], categories: [], aliasNotes: [] };
    const termMatches = (text) => {
      const words = String(text).toLowerCase().split(/[\s,/&()-]+/).filter(Boolean);
      return tokens.some((tok) =>
        words.some((w) =>
          w === tok ||
          w.startsWith(tok) ||                   // typed prefix of a longer alias word
          (w.length >= 4 && tok.startsWith(w))   // plural/inflected form ("bracelets" → "bracelet")
        )
      );
    };
    const catMatches = (c) =>
      termMatches(c.name) || termMatches(c.examples) ||
      c.aliases.some(termMatches);

    // Curated multilingual aliases from the data layer (searchAliases.json):
    // "rueda"→remedies, "halad"→spices, "degchi"→cookware — terms the app's own
    // hardcoded lists may miss. This makes the data layer drive search.
    const aliasHits = searchAliases.filter((a) => termMatches(a.alias));
    const aliasCatIds = new Set(aliasHits.map((a) => a.category));

    const categories = CATEGORIES.filter(
      (c) => catMatches(c) || aliasCatIds.has(c.id)
    );
    const catIds = new Set(categories.map((c) => c.id));
    // Records that match directly, PLUS the records of any matched category —
    // so an alias search ("haldi", "barro") shows findings, not an empty grid.
    const records = RECORDS.filter((r) =>
      termMatches(r.title) || termMatches(r.note) || termMatches(r.source) ||
      termMatches(r.place || "") || catIds.has(r.cat)
    );
    const seen = new Set();
    const aliasNotes = aliasHits.filter((a) => {
      const k = `${a.alias}|${a.canonical}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return { records, categories, aliasNotes };
  }, [q]);

  const goSearch = () => { if (q) setView({ type: "search" }); };
  const goHome = () => { setView({ type: "home" }); setQuery(""); };

  const cat = view.type === "cat" ? CATEGORIES.find((c) => c.id === view.id) : null;
  const catRecords = cat ? RECORDS.filter((r) => r.cat === cat.id) : [];

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      {/* Masthead */}
      <header className="bg-teal-900 text-teal-50">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
          <button onClick={goHome} className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300 rounded-sm">
            <h1 className="font-serif text-3xl sm:text-4xl tracking-tight">LeadCheck</h1>
          </button>
          <p className="mt-1 text-teal-100 text-sm sm:text-base max-w-2xl">
            What testing has found about lead in everyday products — spices, pots,
            dishes, toys, cosmetics, remedies — in plain language, with sources.
          </p>
        </div>
      </header>

      {/* Search */}
      <div className="bg-teal-900 pb-6">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goSearch()}
                placeholder="Try: turmeric · surma · barro pot · charm bracelet · azarcon"
                aria-label="Search products and categories"
                className="w-full rounded-md border border-teal-700 bg-white pl-10 pr-3 py-3 text-slate-900 placeholder-slate-400 focus:outline focus:outline-2 focus:outline-amber-400"
              />
            </div>
            <button
              onClick={goSearch}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-medium px-5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-8">
        {/* Standing principle */}
        <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-md p-4">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-700">
            <span className="font-semibold">A product missing from this database is an unknown, not a pass.</span>{" "}
            Only a small fraction of products have ever been tested. One clean test
            of one sample is also just one sample. Category patterns are the most
            honest guide we can give.
          </p>
        </div>

        {view.type === "home" && (
          <>
            <section>
              <h2 className="font-serif text-2xl text-slate-900">Browse by what's in your home</h2>
              <p className="text-sm text-slate-600 mt-1">
                Across a 25-country market study, 18% of 5,007 everyday products
                exceeded lead reference levels — but the risk is very unevenly
                distributed. Start with the category that matches your item.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CATEGORIES.map((c) => {
                  const n = RECORDS.filter((r) => r.cat === c.id).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setView({ type: "cat", id: c.id })}
                      className="text-left bg-white border border-slate-200 hover:border-teal-700 rounded-md p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"
                    >
                      <div className="font-serif text-lg text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{c.examples}</div>
                      <div className="mt-2 font-mono text-[11px] tracking-wide text-teal-800">
                        {n} finding{n === 1 ? "" : "s"} on file →
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
            <WhatToDo />
          </>
        )}

        {view.type === "cat" && cat && (
          <section>
            <button
              onClick={goHome}
              className="inline-flex items-center gap-1 text-sm text-teal-800 hover:text-teal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 rounded-sm"
            >
              <ArrowLeft size={14} /> All categories
            </button>
            <h2 className="font-serif text-3xl mt-2">{cat.name}</h2>
            <p className="text-slate-500 text-sm">{cat.examples}</p>

            <p className="mt-4 text-slate-800 leading-relaxed max-w-3xl">{cat.riskLine}</p>

            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <div className="bg-white border border-amber-200 rounded-md p-4">
                <h3 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">Warning signs</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {cat.redFlags.map((f, i) => (
                    <li key={i} className="flex gap-2"><span className="text-amber-600">–</span><span>{f}</span></li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-teal-200 rounded-md p-4">
                <h3 className="text-sm font-semibold text-teal-900 uppercase tracking-wide">What you can do</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {cat.doNow.map((f, i) => (
                    <li key={i} className="flex gap-2"><span className="text-teal-700">–</span><span>{f}</span></li>
                  ))}
                </ul>
              </div>
            </div>

            <CategoryStats stats={categoryStats.categories[cat.id]} />

            <h3 className="font-serif text-xl mt-8">What testing has found</h3>
            <div className="mt-3 grid gap-3">
              {catRecords.map((r) => <RecordCard key={r.id} r={r} />)}
              {catRecords.length === 0 && (
                <p className="text-sm text-slate-500">No records in the demonstration set for this category yet.</p>
              )}
            </div>

            <div className="mt-8"><WhatToDo /></div>
          </section>
        )}

        {view.type === "search" && (
          <section>
            <button
              onClick={goHome}
              className="inline-flex items-center gap-1 text-sm text-teal-800 hover:text-teal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 rounded-sm"
            >
              <ArrowLeft size={14} /> Start over
            </button>
            <h2 className="font-serif text-2xl mt-2">Results for “{query}”</h2>

            {results.aliasNotes.length > 0 && (
              <div className="mt-3 text-sm text-slate-600">
                {results.aliasNotes.map((a) => (
                  <span key={`${a.alias}|${a.canonical}`} className="mr-3">
                    <span className="font-medium text-slate-800">{a.alias}</span>
                    {a.canonical && a.canonical !== a.alias ? ` — ${a.canonical}` : ""}
                    {a.language ? <span className="text-slate-400"> ({a.language})</span> : ""}
                  </span>
                ))}
              </div>
            )}

            {results.categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {results.categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setView({ type: "cat", id: c.id })}
                    className="bg-teal-900 text-teal-50 text-sm px-3 py-1.5 rounded-full hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"
                  >
                    {c.name} →
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              {results.records.map((r) => <RecordCard key={r.id} r={r} />)}
            </div>

            {!q && (
              <p className="mt-4 text-slate-600">
                Type the name of a product, spice, cosmetic, or remedy above — or{" "}
                <button onClick={goHome} className="text-teal-800 underline underline-offset-2">
                  browse by category
                </button>.
              </p>
            )}

            {q && results.records.length === 0 && results.categories.length === 0 && (
              <div className="mt-4 space-y-6">
                <UnknownState query={query} />
                <WhatToDo />
              </div>
            )}
          </section>
        )}

        {/* About the data */}
        <footer className="border-t border-slate-200 pt-5 pb-8 text-xs text-slate-500 space-y-2">
          <p className="flex items-start gap-2">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold text-slate-600">Prototype with a demonstration dataset.</span>{" "}
              Every entry above is drawn from the public record with its source
              attached; the full database is built by <span className="font-mono">lead_db_ingest.py</span> from
              NYC Health Department testing, Pure Earth's 25-country Rapid Market
              Screening (CC-BY), CPSC recalls, and FDA enforcement reports.
            </span>
          </p>
          <p>
            This is general information, not medical advice. If you think a child
            has been exposed to lead, contact their doctor — a blood lead test is
            the way to know.
          </p>
        </footer>
      </main>
    </div>
  );
}
