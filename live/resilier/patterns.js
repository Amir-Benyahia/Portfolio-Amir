// Subset of the dark patterns ontology (Gray, Santos, Bielova, Mildner, CHI 2024) relevant to cancellation flows.
// "path" = high-level strategy > meso-level > low-level, with the paper's English names; "fr" = short French paraphrase.
const STRATEGIES={
  "Obstruction":"Obstruction",
  "Interface Interference":"Interférence avec l'interface",
  "Forced Action":"Action forcée",
  "Social Engineering":"Ingénierie sociale",
  "Sneaking":"Dissimulation"
};
const PATTERNS={
  roach:{s:"Obstruction",path:"Obstruction > Roach Motel",name:"Roach Motel",fr:"Facile d'entrer, difficile de sortir : se désabonner demande bien plus d'effort que s'abonner."},
  steps:{s:"Obstruction",path:"Obstruction > Adding Steps",name:"Adding Steps",fr:"Des étapes inutiles mais obligatoires s'ajoutent à la tâche."},
  deadend:{s:"Obstruction",path:"Obstruction > Roach Motel > Dead Ends",name:"Dead Ends",fr:"Un lien ou une page qui ne mène pas à l'action cherchée."},
  hidden:{s:"Interface Interference",path:"Interface Interference > Hidden Information",name:"Hidden Information",fr:"L'information ou l'action utile est déguisée ou présentée comme secondaire."},
  prominence:{s:"Interface Interference",path:"Interface Interference > Manipulating Choice Architecture > Visual Prominence",name:"Visual Prominence",fr:"Un élément plus voyant détourne l'attention de l'objectif de la personne."},
  hierarchy:{s:"Interface Interference",path:"Interface Interference > Manipulating Choice Architecture > False Hierarchy",name:"False Hierarchy",fr:"Une option est mise en avant alors que les choix devraient être présentés à égalité."},
  defaults:{s:"Interface Interference",path:"Interface Interference > Bad Defaults",name:"Bad Defaults",fr:"Le réglage par défaut va contre l'intérêt de la personne, qui doit agir pour le changer."},
  trick:{s:"Interface Interference",path:"Interface Interference > Trick Questions",name:"Trick Questions",fr:"Une formulation confuse ou une double négation oriente la réponse."},
  complex:{s:"Interface Interference",path:"Interface Interference > Language Inaccessibility > Complex Language",name:"Complex Language",fr:"Des mots obscurs rendent l'action difficile à reconnaître."},
  framing:{s:"Interface Interference",path:"Interface Interference > Emotional or Sensory Manipulation > Positive or Negative Framing",name:"Positive or Negative Framing",fr:"Couleurs, mots ou images détournent de l'information importante."},
  nagging:{s:"Forced Action",path:"Forced Action > Nagging",name:"Nagging",fr:"Des interruptions répétées poussent à une décision que la personne ne veut pas prendre."},
  continuity:{s:"Forced Action",path:"Forced Action > Forced Continuity",name:"Forced Continuity",fr:"L'abonnement continue ou reprend sans que la personne s'en rende compte."},
  countdown:{s:"Social Engineering",path:"Social Engineering > Urgency > Countdown Timers",name:"Countdown Timers",fr:"Un faux compte à rebours crée une urgence artificielle."},
  shame:{s:"Social Engineering",path:"Social Engineering > Personalization > Confirmshaming",name:"Confirmshaming",fr:"Le refus est formulé pour culpabiliser ou faire honte."},
  hiddencost:{s:"Sneaking",path:"Sneaking > Hiding Information > Drip Pricing, Hidden Costs",name:"Hidden Costs",fr:"Des frais apparaissent tard dans le parcours."}
};
// Legal checklist for an online cancellation flow (France, art. L.215-1-1 C. conso., décret 2023-417; DSA art. 25 when relevant).
const LEGAL=[
  {id:"visible",fr:"Fonction de résiliation directement et facilement accessible depuis l'interface"},
  {id:"label",fr:"Libellé explicite (« résilier votre contrat » ou équivalent)"},
  {id:"free",fr:"Fonction gratuite, sans appel ni courrier"},
  {id:"recap",fr:"Récapitulatif avant confirmation (contrat, date d'effet)"},
  {id:"receipt",fr:"Accusé de réception de la résiliation"},
  {id:"nodp",fr:"Aucun dark pattern observé sur le parcours (DSA art. 25 si plateforme)"}
];
