window.PILOT_SCENES = [
  {
    "id": "01",
    "title": "A map of jobs",
    "visual": "Architecture shows what each part owns and how the parts connect.",
    "points": [
      "Form collects details",
      "Service validates input",
      "Store and view handle records"
    ]
  },
  {
    "id": "02",
    "title": "Follow an inquiry",
    "visual": "Trace one request from the organizer to a saved record and owner view.",
    "points": [
      "Submit fields",
      "Validate and save once",
      "Show to the owner"
    ]
  },
  {
    "id": "03",
    "title": "State over time",
    "visual": "A workflow names states, allowed transitions, and failure behavior.",
    "points": [
      "New → handled",
      "Owner changes status",
      "Failed save ≠ success"
    ]
  },
  {
    "id": "04",
    "title": "Trust boundaries",
    "visual": "Check data and access where information crosses a boundary.",
    "points": [
      "Public input is untrusted",
      "Validate before saving",
      "Protect the private owner view"
    ]
  },
  {
    "id": "05",
    "title": "Safe retries",
    "visual": "A repeated submission should not accidentally create duplicate effects.",
    "points": [
      "Slow network → repeat click",
      "Define the intended effect",
      "Choose a safe retry strategy"
    ]
  },
  {
    "id": "06",
    "title": "Useful detail",
    "visual": "A small map can explain responsibilities without choosing every technology.",
    "points": [
      "Components and data flow",
      "Permissions and failures",
      "Recovery and alternatives"
    ]
  },
  {
    "id": "07",
    "title": "Draw the system",
    "visual": "Label the boxes and arrows that carry an inquiry through the system.",
    "points": [
      "Organizer → form",
      "Validation → inquiry store",
      "Store → owner view"
    ]
  },
  {
    "id": "08",
    "title": "When storage fails",
    "visual": "A failure path must preserve truth and offer a useful next step.",
    "points": [
      "Store unavailable",
      "Form shows a safe error",
      "No false confirmation"
    ]
  },
  {
    "id": "09",
    "title": "Who may act?",
    "visual": "Knowing a record ID is not proof someone can change it.",
    "points": [
      "Identify the user",
      "Check operation permissions",
      "Enforce at the boundary"
    ]
  },
  {
    "id": "10",
    "title": "One source of truth",
    "visual": "A count and detail view both refer to the same inquiry records.",
    "points": [
      "One authoritative record",
      "Multiple views of status",
      "Plan for stale caches"
    ]
  },
  {
    "id": "11",
    "title": "Repeat without harm",
    "visual": "A lost response makes a retry uncertain; design the intended effect explicitly.",
    "points": [
      "Was the first save accepted?",
      "Prevent duplicate records",
      "Document recovery"
    ]
  },
  {
    "id": "12",
    "title": "Test the map",
    "visual": "Ask a person to follow the arrows and explain the failure path.",
    "points": [
      "Trace a submission",
      "Find the access check",
      "Explain the storage failure"
    ]
  },
  {
    "id": "13",
    "title": "From map to spec",
    "visual": "The architecture names validation; the specification defines its exact rules.",
    "points": [
      "Map: validate inquiry",
      "Spec: required fields",
      "Proof: invalid input is rejected"
    ]
  }
];
