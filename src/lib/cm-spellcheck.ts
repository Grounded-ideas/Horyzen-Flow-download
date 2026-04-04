import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { checkWord } from "./spellcheck";

const misspelledDecoration = Decoration.mark({ class: "cm-misspelled" });

export function spellcheckPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.getDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.getDecorations(update.view);
        }
      }

      getDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const { from, to } = view.viewport;
        const text = view.state.doc.sliceString(from, to);
        
        // Simple word regex
        const wordRegex = /[a-zA-Z']+/g;
        let match;

        while ((match = wordRegex.exec(text)) !== null) {
          const word = match[0];
          const start = from + match.index;
          const end = start + word.length;

          if (!checkWord(word)) {
            builder.add(start, end, misspelledDecoration);
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}
