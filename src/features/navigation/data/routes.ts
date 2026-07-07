import type { Route } from "../types";
import { mapAssetUrl } from "./mapAssets";

function route(
  id: string,
  fromCode: string,
  toCode: string,
  durationMinutes: number,
  distanceMeters: number,
  steps: Route["steps"],
  transitionNotes?: string
): Route {
  return {
    id,
    fromCode,
    toCode,
    mapAssetUrl: mapAssetUrl(fromCode, toCode),
    durationMinutes,
    distanceMeters,
    steps,
    transitionNotes
  };
}

export const routes: Route[] = [
  route(
    "r-001",
    "main-auditorium",
    "shas-mosque",
    4,
    320,
    [
      { instruction: "Exit Main Auditorium through the main entrance facing the ICC building.", landmark: "Glass double doors" },
      { instruction: "Turn right and walk along the covered walkway towards SHAS Mosque.", landmark: "Covered pedestrian path" },
      { instruction: "Continue straight past the ICC main entrance on your left.", landmark: "ICC main entrance" },
      { instruction: "Walk down the steps towards the SHAS Mosque main courtyard.", landmark: "SHAS courtyard" },
      { instruction: "Enter SHAS Mosque through the main prayer hall entrance.", landmark: "Main prayer hall doors", note: "Wudu station available at the right side of the entrance" }
    ],
    "Zohor congregational prayer follows. Please perform wudu before entering. Sisters enter through the left entrance."
  ),
  route(
    "r-002",
    "shas-mosque",
    "main-auditorium",
    4,
    320,
    [
      { instruction: "Exit SHAS Mosque through the main entrance.", landmark: "Main prayer hall doors" },
      { instruction: "Walk up the steps towards the covered walkway.", landmark: "SHAS courtyard steps" },
      { instruction: "Continue along the covered walkway. ICC will be on your right.", landmark: "Covered pedestrian path" },
      { instruction: "The Main Auditorium entrance is directly ahead.", landmark: "Glass double doors" },
      { instruction: "Enter Main Auditorium through the main entrance.", landmark: "Main entrance" }
    ]
  ),
  route(
    "r-003",
    "main-auditorium",
    "icc-main-hall",
    2,
    150,
    [
      { instruction: "Exit Main Auditorium and turn left.", landmark: "Main entrance" },
      { instruction: "Walk along the corridor connecting the Auditorium to ICC.", landmark: "Indoor connector" },
      { instruction: "Enter ICC Main Hall through the main lobby doors.", landmark: "ICC lobby" }
    ]
  ),
  route(
    "r-004",
    "icc-main-hall",
    "main-auditorium",
    2,
    150,
    [
      { instruction: "Exit ICC Main Hall through the lobby.", landmark: "ICC lobby" },
      { instruction: "Turn right and follow the indoor connector.", landmark: "Indoor connector" },
      { instruction: "Enter Main Auditorium through the main entrance.", landmark: "Glass double doors" }
    ]
  ),
  route(
    "r-005",
    "icc-main-hall",
    "shas-mosque",
    3,
    280,
    [
      { instruction: "Exit ICC Main Hall through the main entrance.", landmark: "ICC main entrance" },
      { instruction: "Walk straight towards the SHAS Mosque across the open courtyard.", landmark: "ICC-SHAS courtyard" },
      { instruction: "Enter SHAS Mosque through the main prayer hall entrance.", landmark: "Main prayer hall doors", note: "Wudu station available at the right side of the entrance" }
    ],
    "Congregational prayer follows. Wudu station is located at the mosque entrance."
  ),
  route(
    "r-006",
    "shas-mosque",
    "icc-main-hall",
    3,
    280,
    [
      { instruction: "Exit SHAS Mosque through the main entrance.", landmark: "Main prayer hall doors" },
      { instruction: "Walk across the open courtyard towards ICC.", landmark: "ICC-SHAS courtyard" },
      { instruction: "Enter ICC Main Hall through the main entrance.", landmark: "ICC main entrance" }
    ]
  ),
  route(
    "r-007",
    "mini-auditorium",
    "main-auditorium",
    1,
    80,
    [
      { instruction: "Exit Mini Auditorium and turn right.", landmark: "Mini Auditorium entrance" },
      { instruction: "Walk down the short hallway to the Main Auditorium.", landmark: "Main Auditorium entrance" },
      { instruction: "Enter Main Auditorium through the side doors.", landmark: "Side entrance" }
    ]
  ),
  route(
    "r-008",
    "main-auditorium",
    "sejahtera-clinic",
    6,
    500,
    [
      { instruction: "Exit Main Auditorium through the main entrance.", landmark: "Glass double doors" },
      { instruction: "Turn left and follow the road past the ICC building.", landmark: "Road beside ICC" },
      { instruction: "Continue straight. The Sejahtera Clinic is on the right side.", landmark: "Clinic building" },
      { instruction: "Enter the Sejahtera Clinic through the main entrance.", landmark: "Clinic main entrance", note: "Bring your matric card for registration" }
    ],
    "For medical check-ups and emergencies. Matric card required."
  )
];

export function getRoute(fromCode: string, toCode: string): Route | undefined {
  return routes.find((r) => r.fromCode === fromCode && r.toCode === toCode);
}
