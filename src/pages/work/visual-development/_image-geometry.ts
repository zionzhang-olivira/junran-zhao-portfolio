// Native sizes of the curated local WebP files. No runtime image decoding.
interface ImageGeometry {width:number; height:number; srcset?:string;}
export const geometry:Record<string,ImageGeometry> = {
  "/media/red-hood.webp": {"width": 1600, "height": 900, "srcset": "/media/red-hood-small.webp 640w, /media/red-hood.webp 1600w"},
  "/media/temple-warm.webp": {"width": 1600, "height": 963, "srcset": "/media/temple-warm-small.webp 640w, /media/temple-warm.webp 1600w"},
  "/media/temple-cool.webp": {"width": 1600, "height": 963, "srcset": "/media/temple-cool-small.webp 640w, /media/temple-cool.webp 1600w"},
  "/media/sword-board-small.webp": {"width": 640, "height": 418},
  "/media/window-board-small.webp": {"width": 640, "height": 438},
  "/studies/light/room-morning-832.webp": {"width": 832, "height": 500, "srcset": "/media/room-morning-small.webp 640w, /studies/light/room-morning-832.webp 832w"},
  "/studies/light/room-night-832.webp": {"width": 832, "height": 500, "srcset": "/media/room-night-small.webp 640w, /studies/light/room-night-832.webp 832w"},
  "/studies/light/room-neon-832.webp": {"width": 832, "height": 500, "srcset": "/media/room-neon-small.webp 640w, /studies/light/room-neon-832.webp 832w"},
  "/studies/plates/pavilion-reading.webp": {"width": 528, "height": 939, "srcset": "/studies/preview/pavilion-288.webp 288w, /studies/plates/pavilion-reading.webp 528w"},
  "/studies/plates/plumage.webp": {"width": 680, "height": 656, "srcset": "/studies/plates/plumage-reading.webp 264w, /studies/plates/plumage.webp 680w"},
  "/studies/plates/roof.webp": {"width": 735, "height": 605, "srcset": "/studies/plates/roof-reading.webp 264w, /studies/plates/roof.webp 735w"},
  "/studies/plates/berries.webp": {"width": 510, "height": 375},
  "/studies/boards/sword-1.webp": {"width": 477, "height": 267},
  "/studies/boards/sword-2.webp": {"width": 474, "height": 267},
  "/studies/boards/sword-3.webp": {"width": 476, "height": 267},
  "/studies/boards/window-1.webp": {"width": 478, "height": 268},
  "/studies/boards/window-2.webp": {"width": 478, "height": 268},
  "/studies/boards/window-3.webp": {"width": 477, "height": 268},
  "/studies/plates/brother-front.webp": {"width": 183, "height": 570},
  "/studies/plates/brother-side.webp": {"width": 140, "height": 570},
  "/studies/plates/brother-back.webp": {"width": 194, "height": 570},
  "/studies/plates/sister-front.webp": {"width": 151, "height": 343},
  "/studies/plates/sister-side.webp": {"width": 114, "height": 343},
  "/studies/plates/sister-back.webp": {"width": 151, "height": 343},
};

