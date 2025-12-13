let questions = [];
let scores = {}; // safe to localStorage
let currentQuestion = null;
let queue = [];


async function loadQuestions() {
    const res = await fetch('questions.json');
    questions = await res.json();


    // Load score if exists
    const saved = localStorage.getItem('pikt_scores');
    if (saved) scores = JSON.parse(saved);
    else scores = {};


    questions.forEach((q, i) => {
        if (scores[i] === undefined) scores[i] = 0;
    });

    // restore queue from storage if valid, otherwise build randomized queue
    const savedQueueRaw = localStorage.getItem('queue');
    let restored = false;
    if (savedQueueRaw) {
        try {
            const parsed = JSON.parse(savedQueueRaw);
            if (Array.isArray(parsed) && parsed.length === questions.length && parsed.every(i => Number.isInteger(i) && i >= 0 && i < questions.length)) {
                queue = parsed.slice();
                restored = true;
            }
        } catch (e) {
            // ignore parse errors and rebuild
        }
    }

    if (!restored) {
        // build randomized queue of indices
        queue = questions.map((_, i) => i);
        shuffle(queue);
        localStorage.setItem('queue', JSON.stringify(queue));
    }

    updateIndicators();
    showNewQuestion();
}
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}

function updateIndicators() {
    const total = questions.length;
    let nNew = 0, nNot = 0, nLearned = 0;
    for (let i = 0; i < total; i++) {
        const s = scores[i] || 0;
        if (s === 0) nNew++;
        else if (s === 1) nNot++;
        else if (s === 2) nLearned++;
    }
    document.getElementById('new-count').textContent = nNew;
    document.getElementById('notlearned-count').textContent = nNot;
    document.getElementById('learned-count').textContent = nLearned;
}


function showNewQuestion() {
    if (!queue || queue.length === 0) {
        // rebuild queue if empty
        queue = questions.map((_, i) => i);
        shuffle(queue);
    }

    const idx = queue[0];
    currentQuestion = { index: idx, ...questions[idx] };

    const qBox = document.getElementById('question-text');
    qBox.textContent = currentQuestion.question;

    const answers = currentQuestion.answers.map(
        (a, idxAns) =>
            `<label>
          <input type="checkbox" data-index="${idxAns}" />
          <span class="label-text">${a.text}</span>
        </label>`,
    );

    shuffle(answers);

    const answersBox = document.getElementById('answers');
    
    answersBox.innerHTML = answers.join('');

    // reset any inline styles from previous question
    const labels = answersBox.querySelectorAll('label');
    labels.forEach(l => {
        l.style.color = '';
        l.style.fontWeight = '';
        l.classList.remove('checked');
    });

    document.getElementById('result').textContent = '';
    document.getElementById('check-btn').classList.remove('hidden');
    document.getElementById('next-btn').classList.add('hidden');
    updateIndicators();
}


function checkAnswer() {
    const checkboxes = document.querySelectorAll('#answers input');
    let correct = true;


    checkboxes.forEach(cb => {
        const idx = cb.dataset.index;
        const isCorrect = currentQuestion.answers[idx].correct;


        if (cb.checked !== isCorrect) correct = false;
    });


    const resultBox = document.getElementById('result');
    const qIndex = currentQuestion.index;
    if (correct) {
        resultBox.textContent = 'Správne!';
        resultBox.className = 'correct';
        scores[qIndex] = 2; // learned
    } else {
        resultBox.textContent = 'Nesprávne!';
        resultBox.className = 'incorrect';

        // Visually mark correct answers and any wrongly selected answers
        checkboxes.forEach(cb => {
            const idx = cb.dataset.index;
            const isCorrect = currentQuestion.answers[idx].correct;
            const label = cb.parentElement;

            if (isCorrect) {
                label.style.color = 'green';
                label.style.fontWeight = 'bold';
                label.classList.add('checked');
            } else if (cb.checked && !isCorrect) {
                label.style.color = 'red';
                label.classList.add('checked');
            }
        });

        scores[qIndex] = 1; // not learned
    }


    // save scores using consistent key
    localStorage.setItem('pikt_scores', JSON.stringify(scores));

    // Move current question in queue: remove front then reinsert
    const removed = queue.shift();
    if (removed !== undefined) {
        if (!correct) {
            // insert at 5th position (index 4) if possible, otherwise at end
            const insertPos = Math.min(4, queue.length);
            queue.splice(insertPos, 0, removed);
        } else {
            queue.push(removed);
        }
    }

    // persist queue and scores (use consistent key)
    localStorage.setItem('pikt_scores', JSON.stringify(scores));
    localStorage.setItem('queue', JSON.stringify(queue));

    updateIndicators();

    document.getElementById('check-btn').classList.add('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
}


document.getElementById('check-btn').addEventListener('click', checkAnswer);
document.getElementById('next-btn').addEventListener('click', showNewQuestion);

// Reset progress handler
function resetProgress() {
    if (!confirm('Naozaj resetovať postup?')) return;
    // clear stored scores and queue
    localStorage.removeItem('pikt_scores');
    localStorage.removeItem('queue');

    // reset in-memory structures
    scores = {};
    questions.forEach((_, i) => scores[i] = 0);
    queue = questions.map((_, i) => i);
    shuffle(queue);

    // persist new queue (scores already cleared)
    localStorage.setItem('queue', JSON.stringify(queue));

    updateIndicators();
    showNewQuestion();
}

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) resetBtn.addEventListener('click', resetProgress);


loadQuestions();