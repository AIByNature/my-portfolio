// Local OJT source data. Add each verified attendance row from the PDF to dutyRecords.
// Keep source values as strings where their notation must remain exact.
window.ojtData = {
  organization: "Pamantasan ng Lungsod ng Valenzuela (PLV)",
  experience: "Information Technology On-the-Job Training",
  recordedDutyEntries: 65,
  recordedTotalTime: "496.03",
  dutyPeriod: { start: "June 9, 2026", end: "September 28, 2026" },
  // The PDF was not present in the project/workspace during implementation.
  // Do not fill these rows from memory; copy all 65 exact records from the source PDF.
  dutyRecords: [],
  activities: [
    { title: "Computer cloning and deployment in the CABA Computer Laboratories", category: "Software" },
    { title: "Computer laboratory inspection and hard-drive cloning at PLV Annex", category: "Hardware" },
    { title: "Checking, tagging, pairing, and deployment of computer peripherals", category: "Hardware" },
    { title: "Gathering IP addresses of computers at PLV Annex and CPAG", category: "Networking" },
    { title: "Computer laboratory preparation and maintenance at PLV Main and PLV Annex", category: "Hardware" },
    { title: "Online inventory database encoding and inventory-related work", category: "Inventory" },
    { title: "Computer system unit assembly, disassembly, inspection, and hardware deployment", category: "Hardware" },
    { title: "Software account creation and activation in the COED Educational Technology laboratories", category: "Software" },
    { title: "Operating system and application updates, software installation, and license activation or assignment", category: "Software" },
    { title: "Cleaning and organizing the server room", category: "Hardware" },
    { title: "Troubleshooting and assisting with network connections and network ports", category: "Networking" },
    { title: "Computer kiosk inspection, cleaning, repair, and screen replacement", category: "Hardware" },
    { title: "Preparing computer laboratories and equipment for the start of classes", category: "Hardware" },
    { title: "Editing Room cleaning and preparation of computer units", category: "Hardware" },
    { title: "Computer laboratory documentation and preparation of updated desktop wallpapers", category: "Documentation" }
  ],
  skills: [
    "Computer hardware handling and deployment",
    "PC cloning and system preparation",
    "Computer laboratory maintenance",
    "Hardware inspection and peripheral management",
    "Inventory documentation and data encoding",
    "Basic network-related support",
    "Software installation and configuration",
    "Technical documentation",
    "Organization and time management",
    "Communication, teamwork, and adaptability"
  ],
  reflections: {
    overallExperience: "",
    lessonsLearned: "",
    challenges: "",
    futureImprovements: ""
  },
  photos: []
};
