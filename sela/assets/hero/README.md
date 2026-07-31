# hero-scrub.mp4

The hero scrubs a short film of the assembly instead of drawing it, when the
file is present. Drop the encoded video in beside this note as
`hero-scrub.mp4` and it takes over on its own — nothing else needs changing.

It is deliberately not committed: it is a few megabytes of binary that would
sit in every clone forever. Without it the hero falls back to the rendered
WebGL scene, and then to the vector diagram, so the page is complete either
way.

## What the file has to be

Six chapters, one per assembly step, in installation order — concrete wall,
waterproofing, brackets and rails, insulation, ventilated cavity, porcelain
panels. The keyframes in `keyframes/` are the six chapter openings, and
`kf-a.jpg` doubles as the poster.

Scrubbing seeks a new frame on nearly every scroll event, so the encode has to
be seekable at that granularity — a two-second GOP makes the hero feel stuck.

    -c:v libx264 -crf 19 -g 6 -keyint_min 6 -sc_threshold 0 \
      -profile:v high -level 4.0 -pix_fmt yuv420p -movflags +faststart

720p is enough: the figure is never full-bleed, and the seek cost scales with
frame size. Around 18 seconds of footage at 24 fps keeps it near 6 MB.
