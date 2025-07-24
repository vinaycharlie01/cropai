
export const schemesDatabase = [
    {
      id: "pm-kisan",
      name: "PM-KISAN Samman Nidhi",
      keywords: ["financialsupport", "generalsupport", "dbt"],
      eligibility: {
        landOwner: true,
        maxLandAreaAcres: 5, // PM-KISAN originally had a 2-hectare limit, which was later removed. Simplified here.
      },
      description: "A government scheme with the objective to supplement the financial needs of all landholding farmers' families in procuring various inputs to ensure proper crop health and appropriate yields, commensurate with the anticipated farm income. Provides income support of ₹6,000 per year in three equal installments.",
      benefits: "Direct cash transfer of ₹6,000 per year.",
      howToApply: "Register through the official PM-KISAN portal or contact the local patwari/revenue officer or a Common Service Centre (CSC).",
      applicationUrl: "https://pmkisan.gov.in/"
    },
    {
      id: "pmfby",
      name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
      keywords: ["cropinsurance", "financialsupport"],
      eligibility: {
        landOwner: true,
        tenantFarmer: true,
        sharecropper: true,
      },
      description: "The scheme provides comprehensive insurance coverage against failure of the crop thus helping in stabilising the income of the farmers.",
      benefits: "Insurance cover against crop loss due to natural calamities, pests, or diseases. Low premium rates for farmers (2% for Kharif, 1.5% for Rabi, 5% for commercial crops).",
      howToApply: "Enroll through banks, cooperative societies, or the National Crop Insurance Portal (NCIP) before the cut-off date for the season.",
      applicationUrl: "https://pmfby.gov.in/"
    },
    {
      id: "pmksy",
      name: "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
      keywords: ["irrigation", "water", "equipmentsubsidy"],
      eligibility: {
        landOwner: true,
        tenantFarmer: true,
      },
      description: "Launched with the motto of 'Har Khet Ko Pani', the scheme is being implemented to expand cultivated area with assured irrigation, reduce wastage of water and improve water use efficiency. Focuses on 'Per Drop, More Crop'.",
      benefits: "Financial assistance for adopting micro-irrigation systems like drip and sprinkler irrigation. Promotes water conservation and efficient use.",
      howToApply: "Contact the District Agriculture Office or the State Agriculture Department. Applications are often processed through state-specific portals.",
      applicationUrl: "https://pmksy.gov.in/"
    },
    {
      id: "shc",
      name: "Soil Health Card (SHC) Scheme",
      keywords: ["soilhealth", "generalsupport"],
      eligibility: {
        landOwner: true,
        tenantFarmer: true,
      },
      description: "A scheme to provide every farmer with a Soil Health Card, which contains the status of his soil with respect to 12 parameters and provides a basis to apply nutrient and fertilizer recommendations.",
      benefits: "Get a detailed report on soil nutrient status. Receive recommendations on fertilizer dosage and soil amendments needed to improve soil health and crop productivity.",
      howToApply: "Soil samples are collected by the State Agriculture Department officials. The cards are then distributed to the farmers. Contact your local agriculture office for more details.",
      applicationUrl: "https://soilhealth.dac.gov.in/"
    },
    {
      id: "kvk",
      name: "Kisan Credit Card (KCC)",
      keywords: ["financialsupport", "loan", "generalsupport"],
      eligibility: {
        landOwner: true,
        tenantFarmer: true,
        sharecropper: true,
      },
      description: "A scheme that aims at providing adequate and timely credit support from the banking system under a single window with flexible and simplified procedure to the farmers for their cultivation and other needs.",
      benefits: "Provides short-term formal credit for crop cultivation, post-harvest expenses, and consumption requirements. Lower interest rates, often with government subvention.",
      howToApply: "Apply at any commercial bank, regional rural bank, or cooperative bank by filling out a simple application form.",
      applicationUrl: "https://www.jansamarth.in/kisan-credit-card-scheme"
    }
  ];

/**
 * A simple, non-AI fallback to filter schemes based on the user's stated need.
 * @param helpType The user's need, e.g., "Crop Insurance".
 * @returns A list of matching schemes.
 */
export function filterSchemesByKeywords(helpType: string) {
    if (!helpType) return [];
    
    // Normalize the input by removing spaces and converting to lowercase.
    const normalizedHelpType = helpType.replace(/\s+/g, '').toLowerCase();

    return schemesDatabase.filter(scheme =>
        scheme.keywords.some(keyword => normalizedHelpType.includes(keyword))
    );
}
