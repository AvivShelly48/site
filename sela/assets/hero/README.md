# hero-scrub.mp4

The film the hero scrubs through: six chapters, one per assembly step, in
installation order — concrete wall, waterproofing, black vertical profiles on
stainless brackets, insulation, the clip plates and their screws, porcelain.
The stills in `keyframes/` are our own geometry at those six states, and
`kf-a.jpg` doubles as the video poster.

The system this has to be true to: the vertical profiles are the only linear
members. There are no horizontal rails. Tiles are carried on flat stainless
plates screwed to the verticals, with two tongues punched out and bent
forward to make ledges the tile's lower edge sits on. The ventilated cavity
is open air — an earlier cut of this film showed it as a translucent plane,
which is not a thing that exists in the product.

It is committed rather than fetched at build time, so a clone is the whole
site. If it ever goes missing the hero does not break — the film only takes
over once `loadedmetadata` reports a duration, and until then the rendered
WebGL scene is on screen, with the vector diagram under that.

## Re-encoding it

Scrubbing seeks a new frame on nearly every scroll event, so the encode has to
be seekable at that granularity. A two-second GOP is what makes a hero like
this feel stuck; six frames is the whole trick.

    -c:v libx264 -crf 19 -g 6 -keyint_min 6 -sc_threshold 0 \
      -profile:v high -level 4.0 -pix_fmt yuv420p -movflags +faststart

720p is enough — the figure is never full-bleed, and seek cost scales with
frame size. Eighteen seconds at 24 fps keeps the file near 6 MB, which is the
budget worth holding: every visitor pays it before the hero moves.
