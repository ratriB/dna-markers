// Tiny quiz engine. Supports multiple-choice (single correct answer) with
// optional explanations. Bilingual: question/choices/explanation are objects
// keyed by language ({ th: "...", en: "..." }).
//
// Prompt, choice and explanation strings are rendered via innerHTML so they
// can use small inline HTML for emphasis (<strong>, <em>, <small>). This
// matches the i18n system; quiz JSON is authored content (not user input),
// so it's safe to trust.

import { getLang, onLanguageChange, t } from "../i18n.js";

/**
 * @param {HTMLElement} mount
 * @param {Array<{
 *   id: string,
 *   prompt: {th: string, en: string},
 *   choices: Array<{th: string, en: string}>,
 *   answer: number,
 *   explain?: {th: string, en: string}
 * }>} questions
 */
export function renderQuiz(mount, questions) {
  const state = {
    answers: new Map(),
    checked: new Map()
  };

  function render() {
    const lang = getLang();
    const blocks = questions.map((q, idx) => {
      const chosen = state.answers.get(q.id);
      const checked = state.checked.get(q.id);
      const correct = checked && chosen === q.answer;

      const choices = q.choices
        .map((c, ci) => {
          const id = `q-${q.id}-${ci}`;
          const isChosen = chosen === ci;
          return `<label for="${id}">
                    <input type="radio" name="q-${q.id}" id="${id}" value="${ci}"
                           ${isChosen ? "checked" : ""}
                           ${checked ? "disabled" : ""} />
                    <span>${c[lang]}</span>
                  </label>`;
        })
        .join("");

      let feedback = "";
      if (checked) {
        const cls = correct ? "correct" : "wrong";
        const head = correct ? t("quiz.correct") : t("quiz.wrong");
        const explain = q.explain ? `<div>${q.explain[lang]}</div>` : "";
        feedback = `<div class="feedback shown ${cls}">
                      <strong>${head}</strong>${explain}
                    </div>`;
      }

      return `<div class="quiz-question" data-qid="${q.id}">
                <p class="q">${idx + 1}. ${q.prompt[lang]}</p>
                <div class="choices">${choices}</div>
                ${feedback}
              </div>`;
    });

    const allChecked = questions.every(q => state.checked.get(q.id));
    let scoreLine = "";
    if (allChecked) {
      const correct = questions.filter(
        q => state.answers.get(q.id) === q.answer
      ).length;
      scoreLine = `<div class="quiz-score">${t("quiz.score")}: ${correct} / ${questions.length}</div>`;
    }

    mount.innerHTML = `
      ${blocks.join("")}
      <button class="primary" id="quiz-check">${t("quiz.check")}</button>
      ${scoreLine}
    `;

    mount.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener("change", () => {
        const qid = input.name.replace(/^q-/, "");
        state.answers.set(qid, Number(input.value));
      });
    });

    mount.querySelector("#quiz-check").addEventListener("click", () => {
      questions.forEach(q => {
        if (state.answers.has(q.id)) state.checked.set(q.id, true);
      });
      render();
    });
  }

  render();
  // Re-render on language change so prompts/feedback update.
  onLanguageChange(render);
}
