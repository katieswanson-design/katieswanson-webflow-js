/**
 * statement-scroll.js — splits a statement into per-word elements so
 * statement-scroll.css can reveal them one at a time.
 *
 * Requires: nothing. No GSAP, no ScrollTrigger, no scroll listener — this runs
 * once and then does nothing for the rest of the page's life. All of the motion
 * is a CSS scroll-driven animation; see statement-scroll.css.
 *
 * Markup contract:
 *   <p class="statement_text" data-statement>While good design solves …</p>
 *
 * Write the sentence as ordinary text in the Designer. This rewrites it to:
 *   <span class="statement_word" style="--i:0"><span class="statement_word-text">While</span></span>
 *   <span class="statement_word" style="--i:1">…</span>
 *
 * and publishes the word count as --n on the paragraph. The CSS needs both:
 *   --i  which word this is, so each one gets its own slice of the scroll
 *   --n  how many there are, so the slices divide the travel evenly
 *
 * The words are separated by real space text nodes rather than margins. That
 * keeps textContent identical to what was authored, so the sentence still reads
 * correctly to a screen reader and still copies and pastes as a sentence. Do not
 * "optimise" the spaces away into CSS.
 *
 * Safe to run twice: an already-split paragraph is skipped.
 *
 * If this never runs, the paragraph keeps its authored text and the CSS has no
 * --n, so no animation is applied and the statement simply reads as written.
 * That is the intended fallback, not a failure mode.
 */
(function () {
  "use strict";

  var WORD_CLASS = "statement_word";
  var TEXT_CLASS = "statement_word-text";

  function splitStatement(el) {
    if (el.getAttribute("data-statement-split") === "true") return;

    var source = el.textContent.replace(/\s+/g, " ").trim();
    if (!source) return;

    var words = source.split(" ");
    var frag = document.createDocumentFragment();

    for (var i = 0; i < words.length; i++) {
      var word = document.createElement("span");
      word.className = WORD_CLASS;
      word.style.setProperty("--i", String(i));

      var text = document.createElement("span");
      text.className = TEXT_CLASS;
      text.textContent = words[i];

      word.appendChild(text);
      frag.appendChild(word);

      // Real whitespace between words, not a margin. See the note above.
      if (i < words.length - 1) {
        frag.appendChild(document.createTextNode(" "));
      }
    }

    el.textContent = "";
    el.appendChild(frag);
    el.style.setProperty("--n", String(words.length));
    el.setAttribute("data-statement-split", "true");
  }

  function initStatementScroll() {
    var elements = document.querySelectorAll("[data-statement]");
    for (var i = 0; i < elements.length; i++) {
      splitStatement(elements[i]);
    }
  }

  if (window.Webflow) {
    window.Webflow.push(initStatementScroll);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStatementScroll);
  } else {
    initStatementScroll();
  }
})();
