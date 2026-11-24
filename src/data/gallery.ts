import { existsSync } from "node:fs";
import { resolve } from "node:path";
import entries from "./projects.json";
import dimensions from "./media.json";

export const categories = {
  animation: {
    name: "Animation",
    lead: "A rope pulls tight, a branch gives way, and a truck enters the frame. Three short studies of a fox in motion.",
  },
  "visual-development": {
    name: "Visual Development",
    lead: "A room in three lights, a temple in two moods, and characters seen from every side.",
  },
  storyboards: {
    name: "Storyboards",
    lead: "Two sheets exploring camera movement. Follow the red marks across a drawing, then look for the same view in the frames below.",
  },
  illustration: {
    name: "Characters & Illustration",
    lead: "A painted exchange under dark branches and a pavilion drawn in fine black lines.",
  },
} as const;
export type Category = keyof typeof categories;
type Notes = { title: string; alt: string; caption: string; video?: boolean };
const notes: Record<string, Notes> = {
  "fox-pull": {
    title: "Fox pull study",
    alt: "A fox leans back on a taut rope tied to a load.",
    caption: "The rope holds, the feet slide, and the fox falls backwards.",
    video: true,
  },
  "fox-branch": {
    title: "Fox and the branch",
    alt: "A fox reaches up and hangs from a fruit tree.",
    caption:
      "The fox hangs briefly from the branch. The branch breaks, and the fox lands on its back.",
    video: true,
  },
  "fox-truck": {
    title: "Fox and truck",
    alt: "A line-drawn fox encounters the front of a truck.",
    caption: "The truck enters from the right, interrupting the fox’s stride.",
    video: true,
  },
  "fox-turnaround": {
    title: "Fox turnaround",
    alt: "Five full-body drawings rotate the fox from a front view to a back view.",
    caption: "The round head and pointed ears carry through all five angles.",
  },
  "room-morning": {
    title: "Morning",
    alt: "A room cutaway in amber light beside line studies of a chair, wall art and small objects.",
    caption: "Warm sunlight falls across the floor and the center of the rug.",
  },
  "room-night": {
    title: "Night",
    alt: "A room cutaway with a pale blue patch of light across the floor and unchanged drawings beside it.",
    caption: "A cool patch of light crosses the rug and the open floor.",
  },
  "room-neon": {
    title: "Neon",
    alt: "A cutaway room glows violet and cyan beside black-and-white prop drawings.",
    caption: "Violet and cyan pick out the shelves, walls and floor.",
  },
  "temple-warm": {
    title: "Lamplight",
    alt: "A frontal temple interior with amber lamps on either side of an aisle and a golden seated figure.",
    caption:
      "Two rows of lamps lead toward the figure at the end of the aisle.",
  },
  "temple-cool": {
    title: "Blue light",
    alt: "A dark temple interior with a blue-lit figure and a bright blue sign on the right wall.",
    caption:
      "The blue sign on the right competes with the glow around the central figure.",
  },
  siblings: {
    title: "Sibling expressions",
    alt: "A wide sheet of brother and sister gestures and two sets of facial expressions.",
    caption:
      "Body gestures sit beside rows of faces, letting the same feeling read at two scales.",
  },
  "siblings-poses": {
    title: "Poses together",
    alt: "Two siblings lean against one another on a bench, play, and walk together.",
    caption:
      "The distance between the two bodies changes from one pose to the next.",
  },
  "siblings-turnaround": {
    title: "Color turnarounds",
    alt: "Color drawings show the brother in a purple shirt and the sister in a pink dress from three angles.",
    caption:
      "The full figures keep their proportions across front, side and back views.",
  },
  "satchel-character": {
    title: "Satchel character",
    alt: "A character with a shoulder bag is drawn in action, in six expressions and in a full turnaround.",
    caption:
      "This separate sheet collects action poses, expressions and five angles of the outfit.",
  },
  "sword-board": {
    title: "Figures with a sword",
    alt: "A sword-bearing figure appears across a wide drawing with red camera arrows above three framed views.",
    caption:
      "A long horizontal move spans the sword poses. The frames beneath it separate three moments along that path.",
  },
  "window-board": {
    title: "Figure behind glass",
    alt: "A figure with glasses stands behind a small animal in a windowed scene, above three smaller views.",
    caption:
      "The diagonal framing marks draw the eye toward the figure behind the glass.",
  },
  "red-hood": {
    title: "Red Hood and the Wolf",
    alt: "A wolf in glasses holds out red berries to a hooded girl beneath dark branches.",
    caption:
      "A red highlight runs from the wolf’s muzzle, across the berries, to the girl’s curls.",
  },
  "pavilion-phoenix": {
    title: "Tengwang Pavilion and Phoenix",
    alt: "A phoenix spreads its wings above a tiered pavilion, with three Chinese characters running down the right.",
    caption:
      "The long feathers echo the sweep of the eaves. Three large characters anchor the right edge.",
  },
};

export type Project = {
  slug: string;
  category: Category;
  title: string;
  summary: string;
  roles: string[];
  credits: { person: string; roles: string[] }[];
  media: string[];
  publication: string;
};
type Dimensions = {
  width: number;
  height: number;
  smallWidth: number;
  smallHeight: number;
  duration?: number;
};
const mediaDimensions = dimensions as Record<string, Dimensions>;
export function artwork(key: string) {
  const image = notes[key];
  const size = mediaDimensions[key];
  if (!image || !size?.width || !size.height || !size.smallWidth)
    throw new Error(
      "Missing gallery image description or dimensions for " + key,
    );
  const src = "/media/" + key + ".webp";
  const small = "/media/" + key + "-small.webp";
  const video = image.video ? "/media/" + key + ".mp4" : undefined;
  for (const url of [src, small, ...(video ? [video] : [])]) {
    if (!existsSync(resolve("public", "." + url)))
      throw new Error("Missing gallery media " + url);
  }
  if (video && !(Number(size.duration) > 0))
    throw new Error("Missing video duration for " + key);
  return {
    ...image,
    ...size,
    key,
    src,
    small,
    video,
    srcset:
      small + " " + size.smallWidth + "w, " + src + " " + size.width + "w",
  };
}
export const projects = (entries as Project[]).filter((item) =>
  process.env.BUILD_TARGET === "public"
    ? item.publication === "approved"
    : ["reviewed", "approved"].includes(item.publication),
);
const distinct = new Set<string>();
for (const item of projects) {
  if (
    !Object.hasOwn(categories, item.category) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) ||
    Object.hasOwn(categories, item.slug) ||
    distinct.has(item.slug)
  )
    throw new Error("Invalid or reserved project slug " + item.slug);
  if (
    !item.title.trim() ||
    !item.summary.trim() ||
    !item.credits.length ||
    !item.media.length ||
    new Set(item.media).size !== item.media.length
  )
    throw new Error("Incomplete project " + item.slug);
  item.media.forEach(artwork);
  distinct.add(item.slug);
}
if (process.env.BUILD_TARGET !== "public") {
  for (const slug of ["fox-motion-studies", "room-light-studies"])
    if (!distinct.has(slug))
      throw new Error("Missing required preview project " + slug);
  for (const key of Object.keys(categories))
    if (!projects.some((item) => item.category === key))
      throw new Error("Empty gallery category " + key);
}
export const categoryPath = (key: Category) => "/work/" + key + "/";
export const projectPath = (project: Project) => "/work/" + project.slug + "/";
export const categoryProjects = (key: Category) =>
  projects.filter((project) => project.category === key);

