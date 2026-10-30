# 🎲 ETMOS RPG — Foundry VTT

Bring your **ETMOS RPG** adventures to Foundry VTT with a dedicated character sheet, a character generator, magical particle compendiums, and tools for composing Magical Phrases.

This is an **independent, unofficial implementation**. ETMOS RPG and the original work belong to **Rafa Reis and Editora Balde Galático**. This repository does not grant permission to distribute the book, its rules, texts, or other third-party materials.

## ✨ Why use it?

Create characters with their starting choices gathered in one window, drag particles from the compendiums into the Grimoire, and build spells using only the particles your character knows. The sheet tracks attributes, resources, Abilities, Concept, and Growth Milestones, while tests and spellcasting appear as chat cards.

## 🎯 Key features

- 🎨 **Character sheet** — Body, Mind, and Soul with SVG icons, visible resources, an enlarged portrait, and automatic saving.
- 🧭 **Character generator** — Attribute allocation and starting choices for particles, Origin traits, and Abilities.
- 📚 **Organized compendiums** — Functions, Objects, Characteristics, Complements by level, Origins, and Practical and Theoretical Abilities. Click an item to read its description or drag it onto a sheet.
- ✨ **Magical Phrase builder** — Select a Function, an Object, and other known particles; describe your intent and send the phrase to chat. The effect’s Complexity is determined by the table.
- 🎲 **Custom tests** — Roll 2d6 with an attribute, a known Ability bonus, and a situational modifier; repeatable Abilities add their bonuses together.
- 💬 **Custom chat cards** — Cards for tests, Magical Phrases, Origin traits, and Abilities.
- 📈 **Growth Milestones** — Five interactive boxes per category, progression bonus selection, and level advancement.
- 📝 **Concept** — Values, Behaviors, Future, Points of Importance, Appearance, and History/Background.

## ⚙️ Compatibility

| **Requirement** | **Version** |
| --- | --- |
| Foundry VTT | V13 or V14 Stable, targeting Build 367 |
| ETMOS for Foundry | 1.0.1 |
| Reference material | ETMOS RPG, by Rafa Reis and Editora Balde Galático |

This package is a **standalone Foundry game system** and does not require another system to be installed. Its structure has been validated through isolated tests; full functionality still needs to be confirmed in actual installations of both Foundry versions.

## 📦 Installation

### Manifest URL

```text
https://github.com/DMArkhron/EtmosRPG-UnofficialDMArkhron/releases/latest/download/system.json
```

### Manual installation

1. Download the `etmos.zip` package from a Release.
2. Close Foundry, extract the ZIP into a folder named `etmos`, and place that folder in `Data/systems/etmos`.
3. Make sure the manifest is located at `Data/systems/etmos/system.json`.
4. Open Foundry, create a world, and select **ETMOS RPG — Não Oficial**.

## 🎮 Getting started

The interface labels below are shown in Portuguese in the system.

- In the Actors directory, click **Gerar personagem ETMOS** (Generate ETMOS Character) to make your level 1 choices.
- Browse the particle, Origin, and Ability compendiums; click an item to read its description or drag it onto an existing sheet.
- On the sheet, open **Grimório → Conjurar** (Grimoire → Cast), build a phrase with known particles, and send your intent to chat.
- Use the **Rolar** (Roll) buttons beside the attributes to apply Abilities and modifiers to a test.
- Mark your **Marcos de Crescimento** (Growth Milestones) and select bonuses when a category is complete.

## 🔄 Updates

Before updating the system or migrating a world from Foundry V13 to V14, back up the world. For manual updates, replace the `etmos` folder and restart Foundry. Check the release notes for data changes and compatibility information.

## 🐛 Issues and suggestions

Open an [**Issue**](https://github.com/DMArkhron/EtmosRPG-UnofficialDMArkhron/issues) and include, whenever possible:

- A screenshot or console error message.
- Your Foundry and system versions.
- Steps to reproduce the problem.
- The modules enabled in the world.

## 👤 Credits and rights

**Unofficial Foundry VTT implementation developed by DM Arkhron.**

**ETMOS RPG is a work by Rafa Reis and Editora Balde Galático.** All rights to the original work, its texts, rules, artwork, and related materials remain with their respective rights holders. This project is not affiliated with, endorsed by, or officially published by Rafa Reis or Editora Balde Galático. Third-party materials remain subject to their respective rights.

- [Rafa Reis](https://linktr.ee/atavolaproducoes)
- [Editora Balde Galático](https://baldegalactico.com.br/jogo/etmos/)
