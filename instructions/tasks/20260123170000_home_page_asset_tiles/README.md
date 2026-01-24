# Home Page Asset Tiles

## Description

I want user to have all asset tiles on the home page.
Each tile should contain:

- Title (shortened if no place for full);
- background image - thumbnail
- badge - status of the asset

Make it as a separate component like `asset-list`.

## Requirements

- Status of the asset should be an enum: waiting for review, in review, reviewed.
- Grid layout:
  - Mobile: 1 asset per row.
  - Desktop: Max 4 assets per row.
- Thumbnail should be used from the first video in the asset.
- Tile should be a link redirecting to the dedicated asset page.
- Add "Add video tile" to the beginning of the list.

## Docs

- https://taiga-ui.dev/llms-full.txt
- https://www.mux.com/llms-full.txt
- https://github.com/muxinc/mux-go
