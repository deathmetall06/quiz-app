// Глобальное состояние приложения
let appState = {
    currentScreen: 'main-menu',
    quiz: {
        title: '',
        questions: []
    },
    game: {
        pin: '',
        isActive: false,
        currentQuestion: 0,
        participants: [],
        scores: {},
        answers: {},
        timer: 20,
        timerInterval: null,
        gameStarted: false
    },
    user: {
        name: '',
        isAdmin: false,
        currentAnswer: null,
        score: 0,
        pointsThisQuestion: 0
    }
};

// Симуляция многопользовательского взаимодействия
const gameStates = {
    participants: [],
    currentGame: null,
    gameProgress: {}
};

// Утилитарные функции
function generatePIN() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function showScreen(screenId) {
    console.log('Переход к экрану:', screenId);
    
    // Скрыть все экраны
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Показать целевой экран
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        appState.currentScreen = screenId;
        console.log('Успешно переключен на экран:', screenId);
    } else {
        console.error('Экран не найден:', screenId);
    }
}

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log('Данные сохранены:', key);
    } catch (e) {
        console.error('Ошибка сохранения в localStorage:', e);
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Ошибка загрузки из localStorage:', e);
        return null;
    }
}

function playSound(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'correct':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
                break;
            case 'incorrect':
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1);
                break;
            case 'tick':
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                break;
            case 'start':
                oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
                break;
        }
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Звук:', type);
    }
}

// Функции создания викторины
function showCreateQuiz() {
    console.log('Открытие экрана создания викторины');
    appState.quiz = { title: '', questions: [] };
    updateQuestionsList();
    showScreen('create-quiz');
}

function updateQuestionsList() {
    const container = document.getElementById('questions-list');
    const count = document.getElementById('questions-count');
    
    if (!container || !count) return;
    
    container.innerHTML = '';
    count.textContent = appState.quiz.questions.length;
    
    appState.quiz.questions.forEach((question, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        
        let imageHtml = '';
        if (question.image) {
            imageHtml = `<div class="question-item-image">
                <img src="${question.image}" alt="Изображение к вопросу">
            </div>`;
        }
        
        let optionsHtml = '';
        if (question.type === 'multiple') {
            optionsHtml = `<div class="question-item-options">
                Варианты: ${question.options.map((opt, i) => 
                    `${String.fromCharCode(65 + i)}. ${opt} ${i === question.correct ? '✓' : ''}`
                ).join(' | ')}
            </div>`;
        } else {
            optionsHtml = `<div class="question-item-options">
                Правильный ответ: ${question.answer}
            </div>`;
        }
        
        questionItem.innerHTML = `
            <div class="question-item-header">
                <span class="question-item-type">${question.type === 'multiple' ? '4 варианта' : 'Текстовый'}</span>
                <button class="question-item-delete" onclick="deleteQuestion(${index})">✕</button>
            </div>
            ${imageHtml}
            <div class="question-item-text">${question.question}</div>
            ${optionsHtml}
        `;
        
        container.appendChild(questionItem);
    });
}

function deleteQuestion(index) {
    appState.quiz.questions.splice(index, 1);
    updateQuestionsList();
}

function setupImagePreview(inputId, previewId) {
    const imageInput = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (imageInput && preview) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Превью изображения">`;
                    preview.classList.add('image-preview');
                };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '';
                preview.classList.remove('image-preview');
            }
        });
    }
}

function addQuestion() {
    console.log('Добавление вопроса');
    const questionType = document.querySelector('input[name="questionType"]:checked')?.value;
    
    if (!questionType) {
        alert('Выберите тип вопроса');
        return;
    }
    
    if (questionType === 'multiple') {
        const questionText = document.getElementById('mc-question')?.value?.trim();
        const options = [
            document.getElementById('option-0')?.value?.trim(),
            document.getElementById('option-1')?.value?.trim(),
            document.getElementById('option-2')?.value?.trim(),
            document.getElementById('option-3')?.value?.trim()
        ];
        const correctAnswer = document.querySelector('input[name="correctAnswer"]:checked');
        const imageFile = document.getElementById('mc-question-image')?.files[0];
        
        if (!questionText) {
            alert('Введите текст вопроса');
            return;
        }
        
        if (options.some(opt => !opt)) {
            alert('Заполните все варианты ответов');
            return;
        }
        
        if (!correctAnswer) {
            alert('Выберите правильный ответ!');
            return;
        }
        
        const question = {
            type: 'multiple',
            question: questionText,
            options: options,
            correct: parseInt(correctAnswer.value),
            timeLimit: 20,
            image: null
        };
        
        if (imageFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                question.image = e.target.result;
                appState.quiz.questions.push(question);
                clearMultipleChoiceForm();
                updateQuestionsList();
            };
            reader.readAsDataURL(imageFile);
        } else {
            appState.quiz.questions.push(question);
            clearMultipleChoiceForm();
            updateQuestionsList();
        }
        
    } else {
        const questionText = document.getElementById('text-question')?.value?.trim();
        const correctAnswer = document.getElementById('correct-text-answer')?.value?.trim();
        const imageFile = document.getElementById('text-question-image')?.files[0];
        
        if (!questionText) {
            alert('Введите текст вопроса');
            return;
        }
        
        if (!correctAnswer) {
            alert('Введите правильный ответ');
            return;
        }
        
        const question = {
            type: 'text',
            question: questionText,
            answer: correctAnswer.toLowerCase(),
            timeLimit: 20,
            image: null
        };
        
        if (imageFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                question.image = e.target.result;
                appState.quiz.questions.push(question);
                clearTextAnswerForm();
                updateQuestionsList();
            };
            reader.readAsDataURL(imageFile);
        } else {
            appState.quiz.questions.push(question);
            clearTextAnswerForm();
            updateQuestionsList();
        }
    }
    
    playSound('tick');
}

function clearMultipleChoiceForm() {
    const elements = {
        'mc-question': '',
        'mc-question-image': '',
        'option-0': '',
        'option-1': '',
        'option-2': '',
        'option-3': ''
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    });
    
    const preview = document.getElementById('mc-image-preview');
    if (preview) {
        preview.innerHTML = '';
    }
    
    document.querySelectorAll('input[name="correctAnswer"]').forEach(input => {
        input.checked = false;
    });
}

function clearTextAnswerForm() {
    const elements = {
        'text-question': '',
        'correct-text-answer': '',
        'text-question-image': ''
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    });
    
    const preview = document.getElementById('text-image-preview');
    if (preview) {
        preview.innerHTML = '';
    }
}

function saveQuiz() {
    console.log('Сохранение викторины');
    const title = document.getElementById('quiz-title')?.value?.trim();
    
    if (!title) {
        alert('Введите название викторины');
        return;
    }
    
    if (appState.quiz.questions.length === 0) {
        alert('Добавьте хотя бы один вопрос');
        return;
    }
    
    appState.quiz.title = title;
    saveToLocalStorage('quiz', appState.quiz);
    
    alert('Викторина сохранена!');
    showScreen('main-menu');
}

// Функции игры (администратор)
function startGameAsAdmin() {
    console.log('Запуск игры администратором');
    
    // Проверяем, есть ли сохраненная викторина
    const savedQuiz = loadFromLocalStorage('quiz');
    if (!savedQuiz || !savedQuiz.questions || savedQuiz.questions.length === 0) {
        alert('Сначала создайте викторину!');
        return;
    }
    
    appState.quiz = savedQuiz;
    appState.user.isAdmin = true;
    appState.game.pin = generatePIN();
    appState.game.participants = []; // Убираем демо пользователей
    appState.game.scores = {};
    appState.game.answers = {};
    appState.game.currentQuestion = 0;
    appState.game.isActive = false;
    appState.game.gameStarted = false;
    
    // Сохраняем игру в localStorage для обмена между участниками
    saveToLocalStorage(`game_${appState.game.pin}`, {
        quiz: appState.quiz,
        participants: appState.game.participants,
        gameStarted: appState.game.gameStarted,
        currentQuestion: appState.game.currentQuestion,
        isActive: appState.game.isActive
    });
    
    // Обновляем интерфейс
    const pinDisplay = document.getElementById('game-pin');
    if (pinDisplay) {
        pinDisplay.textContent = appState.game.pin;
    }
    
    generateQRCode();
    updateParticipantsList();
    
    showScreen('game-admin');
    
    // Начинаем проверку новых участников
    startParticipantPolling();
}

function generateQRCode() {
    const qrContainer = document.getElementById('qr-code');
    if (!qrContainer) return;
    
    qrContainer.innerHTML = '';
    
    const url = `${window.location.origin}${window.location.pathname}?pin=${appState.game.pin}`;
    
    if (typeof QRCode !== 'undefined') {
        try {
            new QRCode(qrContainer, {
                text: url,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
            });
        } catch (e) {
            console.error('Ошибка создания QR-кода:', e);
            qrContainer.innerHTML = `
                <div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 12px; text-align: center; border-radius: 8px;">
                    QR-код<br>
                    PIN: ${appState.game.pin}
                </div>
            `;
        }
    } else {
        qrContainer.innerHTML = `
            <div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 12px; text-align: center; border-radius: 8px;">
                QR-код<br>
                PIN: ${appState.game.pin}
            </div>
        `;
    }
}

function startParticipantPolling() {
    setInterval(() => {
        if (appState.user.isAdmin && appState.currentScreen === 'game-admin') {
            checkForNewParticipants();
        }
    }, 1000);
}

function checkForNewParticipants() {
    const gameData = loadFromLocalStorage(`game_${appState.game.pin}`);
    if (gameData && gameData.participants) {
        const newParticipants = gameData.participants.filter(p => !appState.game.participants.includes(p));
        newParticipants.forEach(participant => {
            appState.game.participants.push(participant);
            appState.game.scores[participant] = 0;
            playSound('tick');
        });
        
        if (newParticipants.length > 0) {
            updateParticipantsList();
            updateStartGameButton();
        }
    }
}

function updateParticipantsList() {
    const container = document.getElementById('participants-list');
    const count = document.getElementById('participants-count');
    
    if (!container || !count) return;
    
    container.innerHTML = '';
    count.textContent = appState.game.participants.length;
    
    appState.game.participants.forEach(name => {
        const participantItem = document.createElement('div');
        participantItem.className = 'participant-item';
        participantItem.innerHTML = `
            <div class="participant-status"></div>
            <div class="participant-name">${name}</div>
        `;
        container.appendChild(participantItem);
    });
}

function updateStartGameButton() {
    const button = document.getElementById('start-game-btn');
    if (button) {
        button.disabled = appState.game.participants.length === 0;
    }
}

function startGame() {
    console.log('Начало игры');
    if (appState.game.participants.length === 0) {
        alert('Нет участников для начала игры!');
        return;
    }
    
    appState.game.isActive = true;
    appState.game.gameStarted = true;
    appState.game.currentQuestion = 0;
    
    // Сохраняем начало игры
    saveToLocalStorage(`game_${appState.game.pin}`, {
        quiz: appState.quiz,
        participants: appState.game.participants,
        gameStarted: true,
        currentQuestion: 0,
        isActive: true
    });
    
    playSound('start');
    showNextQuestion();
}

function showNextQuestion() {
    if (appState.game.currentQuestion >= appState.quiz.questions.length) {
        endGame();
        return;
    }
    
    const question = appState.quiz.questions[appState.game.currentQuestion];
    appState.game.answers = {};
    appState.game.timer = question.timeLimit;
    
    updateAdminQuestionDisplay(question);
    
    // Сохраняем состояние вопроса
    saveToLocalStorage(`game_${appState.game.pin}`, {
        quiz: appState.quiz,
        participants: appState.game.participants,
        gameStarted: true,
        currentQuestion: appState.game.currentQuestion,
        isActive: true,
        questionStarted: true
    });
    
    startQuestionTimer();
    showScreen('question-admin');
}

function updateAdminQuestionDisplay(question) {
    const qNumber = document.getElementById('admin-q-number');
    const qTotal = document.getElementById('admin-q-total');
    const qText = document.getElementById('admin-question-text');
    
    if (qNumber) qNumber.textContent = appState.game.currentQuestion + 1;
    if (qTotal) qTotal.textContent = appState.quiz.questions.length;
    if (qText) qText.textContent = question.question;
    
    const imageContainer = document.getElementById('admin-question-image');
    if (imageContainer) {
        if (question.image) {
            imageContainer.innerHTML = `<img src="${question.image}" alt="Изображение к вопросу">`;
        } else {
            imageContainer.innerHTML = '';
        }
    }
    
    const optionsContainer = document.getElementById('admin-answer-options');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        
        if (question.type === 'multiple') {
            question.options.forEach((option, index) => {
                const optionBtn = document.createElement('div');
                optionBtn.className = `answer-btn option-${String.fromCharCode(97 + index)}`;
                optionBtn.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
                optionsContainer.appendChild(optionBtn);
            });
        } else {
            optionsContainer.innerHTML = '<p>Участники вводят текстовый ответ</p>';
        }
    }
    
    const statsContainer = document.getElementById('admin-answer-stats');
    if (statsContainer) {
        statsContainer.innerHTML = '';
    }
    
    const nextBtn = document.getElementById('next-question-btn');
    if (nextBtn) {
        nextBtn.disabled = true;
    }
}

function startQuestionTimer() {
    const updateTimer = () => {
        const adminTimer = document.getElementById('admin-timer');
        const participantTimer = document.getElementById('participant-timer');
        
        if (adminTimer) adminTimer.textContent = appState.game.timer;
        if (participantTimer) participantTimer.textContent = appState.game.timer;
        
        const timerElements = document.querySelectorAll('.timer');
        if (appState.game.timer <= 5) {
            timerElements.forEach(el => el.classList.add('warning'));
            playSound('tick');
        } else {
            timerElements.forEach(el => el.classList.remove('warning'));
        }
    };
    
    updateTimer();
    
    if (appState.game.timerInterval) {
        clearInterval(appState.game.timerInterval);
    }
    
    appState.game.timerInterval = setInterval(() => {
        appState.game.timer--;
        updateTimer();
        
        if (appState.game.timer <= 0) {
            endQuestion();
        }
    }, 1000);
}

function endQuestion() {
    if (appState.game.timerInterval) {
        clearInterval(appState.game.timerInterval);
    }
    
    calculateScores();
    simulateOtherAnswers();
    
    if (!appState.user.isAdmin) {
        showAnswerResult();
    }
    
    updateAnswerStats();
    const nextBtn = document.getElementById('next-question-btn');
    if (nextBtn) {
        nextBtn.disabled = false;
    }
}

function calculateScores() {
    const question = appState.quiz.questions[appState.game.currentQuestion];
    const maxPoints = 1000;
    const minPoints = 500;
    
    // Сбрасываем очки за этот вопрос
    appState.user.pointsThisQuestion = 0;
    
    Object.entries(appState.game.answers).forEach(([playerName, answerData]) => {
        let isCorrect = false;
        
        if (question.type === 'multiple') {
            isCorrect = answerData.answer === question.correct;
        } else {
            isCorrect = answerData.answer === question.answer;
        }
        
        if (isCorrect) {
            const timeRatio = answerData.time / question.timeLimit;
            const points = Math.round(minPoints + (maxPoints - minPoints) * timeRatio);
            appState.game.scores[playerName] = (appState.game.scores[playerName] || 0) + points;
            
            if (playerName === appState.user.name) {
                appState.user.score = appState.game.scores[playerName];
                appState.user.pointsThisQuestion = points;
            }
        }
    });
}

function simulateOtherAnswers() {
    const question = appState.quiz.questions[appState.game.currentQuestion];
    
    appState.game.participants.forEach(name => {
        if (!appState.game.answers[name] && name !== appState.user.name) {
            let answer;
            const randomTime = Math.floor(Math.random() * question.timeLimit);
            
            if (question.type === 'multiple') {
                if (Math.random() < 0.7) {
                    answer = question.correct;
                } else {
                    answer = Math.floor(Math.random() * 4);
                }
            } else {
                answer = Math.random() < 0.6 ? question.answer : 'неправильный ответ';
            }
            
            appState.game.answers[name] = {
                answer: answer,
                time: randomTime
            };
        }
    });
    
    calculateScores();
    updateAnswerStats();
}

function updateAnswerStats() {
    if (!appState.user.isAdmin) return;
    
    const question = appState.quiz.questions[appState.game.currentQuestion];
    const statsContainer = document.getElementById('admin-answer-stats');
    
    if (!statsContainer) return;
    
    if (question.type === 'multiple') {
        const counts = [0, 0, 0, 0];
        Object.values(appState.game.answers).forEach(answer => {
            if (typeof answer.answer === 'number' && answer.answer >= 0 && answer.answer < 4) {
                counts[answer.answer]++;
            }
        });
        
        statsContainer.innerHTML = '';
        question.options.forEach((option, index) => {
            const statBar = document.createElement('div');
            statBar.className = `stat-bar option-${String.fromCharCode(97 + index)}`;
            
            const count = counts[index];
            const percentage = appState.game.participants.length > 0 ? 
                Math.round((count / appState.game.participants.length) * 100) : 0;
            
            statBar.innerHTML = `
                <span>${String.fromCharCode(65 + index)}. ${option}</span>
                <span>${count} (${percentage}%)</span>
            `;
            
            if (index === question.correct) {
                statBar.style.border = '3px solid #fff';
            }
            
            statsContainer.appendChild(statBar);
        });
    } else {
        const answersCount = Object.keys(appState.game.answers).length;
        statsContainer.innerHTML = `<p>Ответов получено: ${answersCount} из ${appState.game.participants.length}</p>`;
    }
}

function nextQuestion() {
    appState.game.currentQuestion++;
    showNextQuestion();
}

function endGame() {
    showPodium();
}

function showPodium() {
    const sortedScores = Object.entries(appState.game.scores)
        .filter(([name]) => name !== appState.user.name || !appState.user.isAdmin) // Исключаем админа из рейтинга
        .sort(([,a], [,b]) => b - a);
    
    const places = ['first', 'second', 'third'];
    places.forEach((place, index) => {
        const nameElement = document.getElementById(`${place}-place-name`);
        const scoreElement = document.getElementById(`${place}-place-score`);
        
        if (nameElement && scoreElement) {
            if (sortedScores[index]) {
                nameElement.textContent = sortedScores[index][0];
                scoreElement.textContent = `${sortedScores[index][1]} очков`;
            } else {
                nameElement.textContent = '-';
                scoreElement.textContent = '0 очков';
            }
        }
    });
    
    showScreen('podium');
    playSound('start');
}

function showFullRating() {
    const sortedScores = Object.entries(appState.game.scores)
        .filter(([name]) => name !== appState.user.name || !appState.user.isAdmin) // Исключаем админа из рейтинга
        .sort(([,a], [,b]) => b - a);
    
    const ratingList = document.getElementById('rating-list');
    if (!ratingList) return;
    
    ratingList.innerHTML = '';
    
    sortedScores.forEach(([name, score], index) => {
        const ratingItem = document.createElement('div');
        ratingItem.className = `rating-item ${index < 3 ? 'top-three' : ''}`;
        
        let medal = '';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        
        ratingItem.innerHTML = `
            <div class="position">${medal} ${index + 1}</div>
            <div class="name">${name}</div>
            <div class="score">${score} очков</div>
        `;
        
        ratingList.appendChild(ratingItem);
    });
    
    showScreen('full-rating');
}

// Функции для участников
function joinGame() {
    const pinInput = document.getElementById('join-pin');
    const nameInput = document.getElementById('participant-name');
    
    if (!pinInput || !nameInput) return;
    
    const pin = pinInput.value.trim();
    const name = nameInput.value.trim();
    
    if (!pin || pin.length !== 4) {
        alert('Введите корректный PIN-код (4 цифры)');
        return;
    }
    
    if (!name) {
        alert('Введите ваше имя');
        return;
    }
    
    // Проверяем, существует ли игра с таким PIN
    const gameData = loadFromLocalStorage(`game_${pin}`);
    if (!gameData) {
        alert('Игра с таким PIN-кодом не найдена');
        return;
    }
    
    appState.user.name = name;
    appState.user.isAdmin = false;
    appState.user.score = 0;
    appState.game.pin = pin;
    appState.quiz = gameData.quiz;
    
    // Добавляем участника в игру
    const participants = gameData.participants || [];
    if (!participants.includes(name)) {
        participants.push(name);
        saveToLocalStorage(`game_${pin}`, {
            ...gameData,
            participants: participants
        });
    }
    
    const waitingName = document.getElementById('waiting-name');
    const waitingPin = document.getElementById('waiting-pin');
    
    if (waitingName) waitingName.textContent = name;
    if (waitingPin) waitingPin.textContent = pin;
    
    showScreen('waiting-room');
    
    // Начинаем ожидание начала игры
    startGamePolling();
}

function startGamePolling() {
    const checkGameStart = () => {
        const gameData = loadFromLocalStorage(`game_${appState.game.pin}`);
        if (gameData && gameData.gameStarted) {
            appState.game.isActive = true;
            appState.game.currentQuestion = gameData.currentQuestion;
            
            if (gameData.questionStarted) {
                showParticipantQuestion();
            }
        }
    };
    
    setInterval(checkGameStart, 1000);
}

function showParticipantQuestion() {
    const question = appState.quiz.questions[appState.game.currentQuestion];
    if (!question) return;
    
    appState.game.timer = question.timeLimit;
    appState.user.currentAnswer = null;
    
    updateParticipantQuestionDisplay(question);
    startQuestionTimer();
    showScreen('question-participant');
}

function updateParticipantQuestionDisplay(question) {
    const qNumber = document.getElementById('participant-q-number');
    const qTotal = document.getElementById('participant-q-total');
    const qText = document.getElementById('participant-question-text');
    
    if (qNumber) qNumber.textContent = appState.game.currentQuestion + 1;
    if (qTotal) qTotal.textContent = appState.quiz.questions.length;
    if (qText) qText.textContent = question.question;
    
    const imageContainer = document.getElementById('participant-question-image');
    if (imageContainer) {
        if (question.image) {
            imageContainer.innerHTML = `<img src="${question.image}" alt="Изображение к вопросу">`;
        } else {
            imageContainer.innerHTML = '';
        }
    }
    
    const optionsContainer = document.getElementById('participant-answer-options');
    const textInputContainer = document.getElementById('text-answer-input');
    
    if (question.type === 'multiple') {
        if (optionsContainer) {
            optionsContainer.classList.remove('hidden');
            optionsContainer.innerHTML = '';
            question.options.forEach((option, index) => {
                const optionBtn = document.createElement('button');
                optionBtn.className = `answer-btn option-${String.fromCharCode(97 + index)}`;
                optionBtn.textContent = option;
                optionBtn.onclick = () => submitAnswer(index);
                optionsContainer.appendChild(optionBtn);
            });
        }
        if (textInputContainer) {
            textInputContainer.classList.add('hidden');
        }
    } else {
        if (optionsContainer) {
            optionsContainer.classList.add('hidden');
        }
        if (textInputContainer) {
            textInputContainer.classList.remove('hidden');
            const textInput = document.getElementById('text-answer');
            if (textInput) {
                textInput.value = '';
                textInput.disabled = false;
            }
            const submitBtn = document.getElementById('submit-text-answer');
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        }
    }
}

function submitAnswer(answerIndex) {
    if (appState.user.currentAnswer !== null) return;
    
    appState.user.currentAnswer = answerIndex;
    appState.game.answers[appState.user.name] = {
        answer: answerIndex,
        time: appState.game.timer
    };
    
    document.querySelectorAll('.answer-btn').forEach((btn, index) => {
        if (index === answerIndex) {
            btn.classList.add('selected');
        }
        btn.disabled = true;
    });
    
    playSound('tick');
    
    // Ждем окончания вопроса
    setTimeout(() => {
        if (appState.game.currentQuestion + 1 >= appState.quiz.questions.length) {
            showPodium();
        } else {
            appState.game.currentQuestion++;
            setTimeout(() => {
                showParticipantQuestion();
            }, 2000);
        }
    }, 3000);
}

function submitTextAnswer() {
    const textInput = document.getElementById('text-answer');
    if (!textInput) return;
    
    const textAnswer = textInput.value.trim().toLowerCase();
    if (!textAnswer || appState.user.currentAnswer !== null) return;
    
    appState.user.currentAnswer = textAnswer;
    appState.game.answers[appState.user.name] = {
        answer: textAnswer,
        time: appState.game.timer
    };
    
    const submitBtn = document.getElementById('submit-text-answer');
    if (submitBtn) submitBtn.disabled = true;
    textInput.disabled = true;
    
    playSound('tick');
    
    // Ждем окончания вопроса
    setTimeout(() => {
        if (appState.game.currentQuestion + 1 >= appState.quiz.questions.length) {
            showPodium();
        } else {
            appState.game.currentQuestion++;
            setTimeout(() => {
                showParticipantQuestion();
            }, 2000);
        }
    }, 3000);
}

function showAnswerResult() {
    const question = appState.quiz.questions[appState.game.currentQuestion];
    const userAnswer = appState.user.currentAnswer;
    let isCorrect = false;
    
    if (question.type === 'multiple') {
        isCorrect = userAnswer === question.correct;
    } else {
        isCorrect = userAnswer === question.answer;
    }
    
    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    const currentScore = document.getElementById('current-score');
    const pointsEarned = document.getElementById('points-earned');
    
    if (resultIcon) {
        resultIcon.textContent = isCorrect ? '✅' : '❌';
    }
    
    if (resultTitle) {
        resultTitle.textContent = isCorrect ? 'Правильно!' : 'Неправильно!';
        resultTitle.className = isCorrect ? 'correct' : 'incorrect';
    }
    
    if (currentScore) {
        currentScore.textContent = appState.user.score;
    }
    
    if (pointsEarned) {
        pointsEarned.textContent = appState.user.pointsThisQuestion;
    }
    
    showScreen('answer-result');
    playSound(isCorrect ? 'correct' : 'incorrect');
    
    // Автоматически переходим к следующему вопросу или результатам
    setTimeout(() => {
        if (appState.game.currentQuestion + 1 >= appState.quiz.questions.length) {
            showPodium();
        } else {
            appState.game.currentQuestion++;
            showParticipantQuestion();
        }
    }, 3000);
}

// Инициализация приложения
function initApp() {
    console.log('Инициализация приложения викторины...');
    
    // Проверка URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const pin = urlParams.get('pin');
    
    if (pin) {
        const joinPinInput = document.getElementById('join-pin');
        if (joinPinInput) {
            joinPinInput.value = pin;
            showScreen('participant-join');
        }
    }
    
    // Обработчики главного меню
    const createQuizBtn = document.getElementById('create-quiz-btn');
    const playQuizBtn = document.getElementById('play-quiz-btn');
    
    if (createQuizBtn) {
        createQuizBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик по кнопке "Создать викторину"');
            showCreateQuiz();
        });
    }
    
    if (playQuizBtn) {
        playQuizBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик по кнопке "Играть"');
            startGameAsAdmin();
        });
    }
    
    // Обработчики создания викторины
    const questionTypeRadios = document.querySelectorAll('input[name="questionType"]');
    questionTypeRadios.forEach(radio => {
        radio.addEventListener('change', function(e) {
            const multipleForm = document.getElementById('multiple-choice-form');
            const textForm = document.getElementById('text-answer-form');
            
            if (e.target.value === 'multiple') {
                if (multipleForm) multipleForm.classList.remove('hidden');
                if (textForm) textForm.classList.add('hidden');
            } else {
                if (multipleForm) multipleForm.classList.add('hidden');
                if (textForm) textForm.classList.remove('hidden');
            }
        });
    });
    
    // Настройка превью изображений
    setTimeout(() => {
        setupImagePreview('mc-question-image', 'mc-image-preview');
        setupImagePreview('text-question-image', 'text-image-preview');
    }, 100);
    
    // Привязка всех обработчиков кнопок
    const buttons = {
        'add-question-btn': () => {
            console.log('Клик по кнопке добавления вопроса');
            addQuestion();
        },
        'save-quiz-btn': () => {
            console.log('Клик по кнопке сохранения викторины');
            saveQuiz();
        },
        'back-to-menu-btn': () => {
            console.log('Клик по кнопке "Назад"');
            showScreen('main-menu');
        },
        'start-game-btn': () => startGame(),
        'admin-back-btn': () => showScreen('main-menu'),
        'join-game-btn': () => joinGame(),
        'join-back-btn': () => showScreen('main-menu'),
        'next-question-btn': () => nextQuestion(),
        'submit-text-answer': () => submitTextAnswer(),
        'show-rating-btn': () => showFullRating(),
        'back-to-podium-btn': () => showScreen('podium'),
        'new-game-btn': () => location.reload(),
        'rating-new-game-btn': () => location.reload()
    };
    
    Object.entries(buttons).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`Клик по кнопке ${id}`);
                handler();
            });
        } else {
            console.log(`Кнопка ${id} не найдена`);
        }
    });
    
    // Обработка Enter в полях ввода
    const joinPinInput = document.getElementById('join-pin');
    if (joinPinInput) {
        joinPinInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
        
        joinPinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const nameInput = document.getElementById('participant-name');
                if (nameInput) nameInput.focus();
            }
        });
    }
    
    const participantNameInput = document.getElementById('participant-name');
    if (participantNameInput) {
        participantNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                joinGame();
            }
        });
    }
    
    const textAnswerInput = document.getElementById('text-answer');
    if (textAnswerInput) {
        textAnswerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitTextAnswer();
            }
        });
    }
    
    console.log('Приложение викторины успешно инициализировано');
}

// Экспорт функций для использования в HTML
window.deleteQuestion = deleteQuestion;
window.submitAnswer = submitAnswer;

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);