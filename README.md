# Blockbrush builds

**See them all at [builds.blockbrush.app](https://builds.blockbrush.app)**, made from this repo on every merge
(`scripts/build-site.js`).

A library of Minecraft builds you can open, walk through and download in
[Blockbrush](https://blockbrush.app). Each build is a folder with its file, a short
description and a preview picture. Blockbrush reads `index.json` to list them.

## Layout

```
builds/
  creeper-cobble/          one folder per build, named in lower case with dashes
    build.litematic        the build (.litematic, .schem, .nbt or .mcstructure)
    info.json              name, author, tags… (see below)
    preview.png            a picture of the build, made in Blockbrush with no texture pack
    build.blockbrush       optional: the editable Blockbrush file (layers, houses, shapes)
    check.json             written after merging: the block count and size Blockbrush counted
  _template/               copy this to start a new build
index.json                 made by scripts/build-index.js, never edited by hand
```

## info.json

```json
{
  "name": "Creeper cobblestone farm",
  "author": "kuues",
  "description": "A compact cobblestone farm run by creepers.",
  "tags": ["farm", "cobblestone", "redstone"],
  "minecraft": "1.21.4",
  "file": "build.litematic",
  "preview": "preview.png",
  "added": "2026-11-05"
}
```

- `name`, `author`, `tags`, `minecraft`, `file` are required.
- `project` is optional: `"build.blockbrush"` when the folder has the editable file. Browse then opens that,
  and offers the schematic too.
- Tags are lower case, words joined with dashes (`mob-farm`). Use existing tags where one fits.
- `check.json` isn't yours to write: it's made after merging (see below).

## Adding a build

The easy way: in Blockbrush, Builds › **Share to the library** (or the Download menu) fills this in, takes the
picture and downloads the folder. Unzip it, open this repo's `builds` folder, **Add file › Upload files**, drag the
folder in and propose the change.

By hand:

1. Copy `builds/_template` to `builds/<your-build>` and fill in `info.json`.
2. Add your build file and a `preview.png`.
3. Open a pull request.

## The check

Every pull request is checked on its own, and the check's page says what to change if something's off:

- every `info.json` is read (`scripts/build-index.js --check`): the fields, the tags, the files it names, sizes
  (build files up to 5 MB, the picture up to 2 MB);
- each build the pull request adds or changes is opened in [Blockbrush](https://blockbrush.app) itself, in a
  headless Chrome (`scripts/check-builds.js`), the same way it opens for anyone: it has to open, have blocks, fit
  Blockbrush's block limit, and use only blocks the Minecraft version in `info.json` has.

Once merged, each new or changed build's file (and editable file) is replaced by Blockbrush's own re-export of it,
in the same format with its details and corner kept, so what the library hands out is always a file Blockbrush
wrote; its block count and size go into `check.json`, the index and the website, where builds sort by size.
Run it yourself with `npm ci`, then `npm run check` (`BLOCKBRUSH_URL` points it at another copy of Blockbrush).

By opening a pull request you agree to share the build under the licence below.

## Licence

Builds are shared under [CC BY 4.0](LICENSE.md): anyone may use and change them, crediting the author.
Don't submit builds that aren't yours to share.
