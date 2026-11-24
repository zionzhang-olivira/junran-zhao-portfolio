export const boards = [
  {
    id: "sword",
    name: "Sword study",
    width: 1653,
    height: 1079,
    alt: "Complete sword storyboard with two camera positions on the panorama above three separate pencil panels.",
    panels: [
      { name: "Stance", bounds: [73, 607, 550, 874], alt: "A swordsman holds the blade upright while a long sleeve stretches across the frame.", note: "The upright blade stays close to the figure’s face. The sweep of the sleeve carries the eye to the right edge." },
      { name: "Turn", bounds: [585, 607, 1059, 874], alt: "The swordsman lifts the blade beside his head.", note: "A vertical line just behind the shoulder divides the drawing. The raised blade occupies the open half." },
      { name: "Encounter", bounds: [1095, 607, 1571, 874], alt: "A second figure faces the swordsman at close range.", note: "Both faces share the frame. The broad sleeve crosses the space between them." }
    ]
  },
  {
    id: "window",
    name: "Window study",
    width: 1578,
    height: 1079,
    alt: "Complete window storyboard with wide and tight camera positions drawn above three smaller views.",
    panels: [
      { name: "Wide view", bounds: [38, 609, 516, 877], alt: "A small animal by the window shares a wide view with a standing figure.", note: "The opening view holds the window corner, the small animal and the standing figure together." },
      { name: "Closing in", bounds: [552, 609, 1030, 877], alt: "The framing tightens around the animal in the window.", note: "The animal stays near the window corner as the standing figure moves toward the right edge." },
      { name: "Window corner", bounds: [1065, 609, 1542, 877], alt: "A close view of the small animal beside the window frame.", note: "The window corner and animal take up more space. Only a sliver of the standing figure remains." }
    ]
  }
];

export function panelImage(sheet, index) {
  return "/studies/boards/" + sheet.id + "-" + (index + 1) + ".webp";
}

export function sheetImage(sheet) {
  return "/media/" + sheet.id + "-board.webp";
}

