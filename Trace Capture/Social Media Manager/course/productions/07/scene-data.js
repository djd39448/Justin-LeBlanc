window.PILOT_SCENES = [
  {
    "id": "01",
    "title": "Standards for readers",
    "visual": "Clear responsibilities and names help the next human or agent.",
    "points": [
      "A module has one clear job",
      "Names explain their purpose",
      "Inputs checked at boundaries"
    ]
  },
  {
    "id": "02",
    "title": "No silent failure",
    "visual": "A failed save should never appear to the visitor as success.",
    "points": [
      "What failed?",
      "Where did it happen?",
      "What is the remedy?"
    ]
  },
  {
    "id": "03",
    "title": "Test the boundary",
    "visual": "Check inputs, outputs, authorization, and important non-effects.",
    "points": [
      "Valid and invalid submission",
      "Unauthorized access denied",
      "Storage failure handled"
    ]
  },
  {
    "id": "04",
    "title": "Small verified slices",
    "visual": "A coherent change pairs implementation with checks and evidence.",
    "points": [
      "Change one behavior",
      "Run the relevant check",
      "Record a reversible revision"
    ]
  },
  {
    "id": "05",
    "title": "Levels of proof",
    "visual": "Each evidence level says only what was actually observed.",
    "points": [
      "Implemented in code",
      "Offline-tested",
      "Provider-accepted or live-observed"
    ]
  },
  {
    "id": "06",
    "title": "Evidence and recovery",
    "visual": "A result needs context; a failure needs a realistic recovery path.",
    "points": [
      "Revision, command, result",
      "Label unverified gaps",
      "Document and rehearse recovery"
    ]
  },
  {
    "id": "07",
    "title": "Readable code",
    "visual": "Purposeful names and narrow responsibilities make future diagnosis easier.",
    "points": [
      "saveInquiry explains intent",
      "Split unrelated responsibilities",
      "Make the behavior findable"
    ]
  },
  {
    "id": "08",
    "title": "A useful error",
    "visual": "Different readers need a clear remedy without exposing private data.",
    "points": [
      "Visitor: enter contact method",
      "Operator: storage component failed",
      "Keep secrets out of logs"
    ]
  },
  {
    "id": "09",
    "title": "Test what must not happen",
    "visual": "Negative tests prove important effects are prevented.",
    "points": [
      "Invalid inquiry is not saved",
      "Unauthorized view is denied",
      "Failed save shows no success"
    ]
  },
  {
    "id": "10",
    "title": "Where was it tested?",
    "visual": "A fake provider and a live observation support different claims.",
    "points": [
      "Mock: app handles a response",
      "Provider: request accepted",
      "Live: real effect observed"
    ]
  },
  {
    "id": "11",
    "title": "Review the change",
    "visual": "Connect the change to its requirement, checks, risks, and rollback.",
    "points": [
      "Which requirement changed?",
      "What passes and fails?",
      "How can we reverse it?"
    ]
  },
  {
    "id": "12",
    "title": "Follow the evidence",
    "visual": "A useful record lets another person assess the proof level.",
    "points": [
      "Revision and environment",
      "Command and sanitized output",
      "Live provider check pending"
    ]
  },
  {
    "id": "13",
    "title": "Show the proof",
    "visual": "Ask for the specific observation behind a broad quality claim.",
    "points": [
      "Which failed-save test?",
      "Which access boundary?",
      "Which environment was checked?"
    ]
  }
];
