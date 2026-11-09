/* =========================================
   SCHOOL SCHEDULE — COMPLETE APP
   ========================================= */

const API_URL = "https://schedule-api.kirillsidun2012.workers.dev/";

/* ---------- 1. CONSTANTS ---------- */

const dayNames = {
    "Пн": "Понедельник",
    "Вт": "Вторник",
    "Ср": "Среда",
    "Чт": "Четверг",
    "Пт": "Пятница",
    "Сб": "Суббота"
};

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

/*
 * Расписание звонков.
 */

const bellSchedule = {
    regular: {
        first: [
            ["08:00", "08:40"],
            ["08:50", "09:30"],
            ["09:50", "10:30"],
            ["10:50", "11:30"],
            ["11:45", "12:25"],
            ["12:35", "13:15"],
            ["13:20", "14:00"]
        ],

        second: [
            ["13:30", "14:10"],
            ["14:20", "15:00"],
            ["15:20", "16:00"],
            ["16:10", "16:50"],
            ["17:00", "17:40"],
            ["17:50", "18:30"]
        ]
    },

    mondayThursday: {
        first: [
            ["08:25", "09:05"],
            ["09:15", "09:55"],
            ["10:15", "10:55"],
            ["11:15", "11:55"],
            ["12:10", "12:50"],
            ["13:00", "13:40"],
            ["13:45", "14:25"]
        ],

        second: [
            ["13:45", "14:25"],
            ["14:35", "15:15"],
            ["15:35", "16:15"],
            ["16:25", "17:05"],
            ["17:15", "17:55"],
            ["18:05", "18:45"]
        ]
    },

    saturday: [
        ["08:00", "08:40"],
        ["08:50", "09:30"],
        ["09:50", "10:30"],
        ["10:50", "11:30"],
        ["11:40", "12:20"],
        ["12:30", "13:10"]
    ]
};


/* ---------- 2. STATE ---------- */

function loadFavorites() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("favorite-classes") || "[]"
        );

        return Array.isArray(saved)
            ? saved.filter(item => typeof item === "string")
            : [];
    } catch {
        return [];
    }
}

const state = {
    data: null,

    selectedClass: "",
    selectedDay: "Пн",
    query: "",

    favoriteClasses: loadFavorites(),

    currentView: "schedule",
    userSelectedView: false,
    initialViewSelected: false,

    teacherQuery: "",
    teacherDay: "Пн"
};


/* ---------- 3. DOM ELEMENTS ---------- */

const el = {
    connection: document.querySelector("#connection"),
    updated: document.querySelector("#updated-at"),

    classSelect: document.querySelector("#class-select"),
    search: document.querySelector("#search-input"),

    reload: document.querySelector("#reload-button"),
    tabs: document.querySelector("#day-tabs"),

    title: document.querySelector("#schedule-title"),
    caption: document.querySelector("#schedule-caption"),
    count: document.querySelector("#lesson-count"),
    list: document.querySelector("#schedule-list"),

    notice: document.querySelector("#notice"),

    theme: document.querySelector("#theme-toggle"),

    dashboard: document.querySelector(".dashboard"),

    favoritesView: document.querySelector("#favorites-view"),
    favoritesList: document.querySelector("#favorites-list"),
    favoritesMobileList: document.querySelector("#favorites-mobile-list"),

    favoriteToggle: document.querySelector("#class-favorite-toggle"),

    teachersView: document.querySelector("#teachers-view"),
    teacherSearch: document.querySelector("#teacher-search-input"),
    teacherList: document.querySelector("#teacher-list"),
    teacherTabs: document.querySelector("#teacher-day-tabs"),

    teacherTitle: document.querySelector("#teacher-results-title"),
    teacherCaption: document.querySelector("#teacher-results-caption"),
    teacherCount: document.querySelector("#teacher-lesson-count"),
    teacherResults: document.querySelector("#teacher-results"),

    headerTitle: document.querySelector(".header-title h1"),
    headerSubtitle: document.querySelector(".header-title p")
};


/* =========================================
   4. GENERAL HELPERS
   ========================================= */

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


function toText(value) {
    if (Array.isArray(value)) {
        return value
            .filter(item => item != null)
            .map(item => String(item).trim())
            .filter(Boolean)
            .join(", ");
    }

    if (value == null) {
        return "";
    }

    return String(value).trim();
}


function lessonWord(number) {
    const mod10 = number % 10;
    const mod100 = number % 100;

    if (mod100 >= 11 && mod100 <= 14) {
        return "уроков";
    }

    if (mod10 === 1) return "урок";
    if (mod10 >= 2 && mod10 <= 4) return "урока";

    return "уроков";
}


function sortLessonNumbers(numbers) {
    return numbers.sort((a, b) => {
        const first = Number(a);
        const second = Number(b);

        if (
            Number.isFinite(first) &&
            Number.isFinite(second)
        ) {
            return first - second;
        }

        return String(a).localeCompare(String(b), "ru");
    });
}


function showNotice(message, type = "") {
    if (!el.notice) return;

    el.notice.hidden = !message;
    el.notice.textContent = message || "";
    el.notice.className = `notice ${type}`.trim();
}


function setConnection(status, label) {
    if (!el.connection) return;

    el.connection.className =
        `connection-status ${status}`;

    el.connection.innerHTML =
        `<i></i>${escapeHtml(label)}`;
}


function formatDate(date) {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(parsedDate);
}

function getCell(section, day, lesson, className) {
    return (
        section?.grid?.[day]?.[String(lesson)]?.[className] ??
        section?.grid?.[day]?.[lesson]?.[className] ??
        null
    );
}


/* =========================================
   5. CLASS AND SHIFT DETECTION
   ========================================= */

function getClassGrade(className) {
    const match = String(className).match(/^\s*(\d+)/);

    return match ? Number(match[1]) : null;
}


function isSecondShiftClass(className) {
    const grade = getClassGrade(className);

    // По текущей схеме API ко второй смене
    // относятся 6-е и 7-е классы.
    return grade === 6 || grade === 7;
}


function getLessonInfo(sourceNumber, className, day) {
    const originalNumber = Number(sourceNumber);

    let shift = "first";
    let lessonNumber = originalNumber;

    if (
        day !== "Сб" &&
        isSecondShiftClass(className)
    ) {
        shift = "second";
        lessonNumber = originalNumber - 6;
    }

    return {
        originalNumber,
        lessonNumber,
        shift
    };
}


/* =========================================
   6. ROOM HELPERS
   ========================================= */

function normalizeRoom(value) {
    const text = toText(value);

    if (!text) return "";

    const rooms = text
        .split(/[,;]+/)
        .map(room => room.trim())
        .filter(Boolean);

    return [...new Set(rooms)].join(", ");
}


function removeRoomSuffix(value, room) {
    let text = toText(value);

    if (!text || !room) {
        return text;
    }

    const normalizedRoom = normalizeRoom(room);

    const match = text.match(/\s*\(([^()]*)\)\s*$/);

    if (!match) {
        return text;
    }

    const suffixRoom = normalizeRoom(match[1]);

    if (
        suffixRoom.replace(/\s/g, "") ===
        normalizedRoom.replace(/\s/g, "")
    ) {
        text = text.slice(0, match.index).trim();
    }

    return text;
}


function getRoom(subjectCell, teacherCell) {
    const directRoom =
        normalizeRoom(subjectCell?.rooms) ||
        normalizeRoom(teacherCell?.rooms);

    if (directRoom) {
        return directRoom;
    }

    const subject = toText(subjectCell?.raw);
    const teacher = toText(teacherCell?.names);

    const subjectMatch = subject.match(/\(([^()]*)\)\s*$/);

    if (subjectMatch) {
        return normalizeRoom(subjectMatch[1]);
    }

    const teacherMatch = teacher.match(/\(([^()]*)\)\s*$/);

    if (teacherMatch) {
        return normalizeRoom(teacherMatch[1]);
    }

    return "";
}


/* =========================================
   7. LESSON TIME
   ========================================= */

function getLessonTime(sourceNumber, className, day) {
    const info = getLessonInfo(
        sourceNumber,
        className,
        day
    );

    const lessonNumber = info.lessonNumber;

    if (
        !Number.isFinite(lessonNumber) ||
        lessonNumber <= 0
    ) {
        return "";
    }

    const index = lessonNumber - 1;

    let schedule;

    if (day === "Сб") {
        schedule = bellSchedule.saturday;
    } else if (day === "Пн" || day === "Чт") {
        schedule = bellSchedule.mondayThursday[info.shift];
    } else {
        schedule = bellSchedule.regular[info.shift];
    }

    const time = schedule?.[index];

    if (!time) {
        console.warn(
            "Не найдено время урока:",
            {
                sourceNumber,
                lessonNumber,
                className,
                day,
                shift: info.shift,
                index
            }
        );

        return "";
    }

    return `${time[0]}–${time[1]}`;
}


/* =========================================
   8. API DATA
   ========================================= */

function getClassNames(data) {
    const values =
        data?.subjects?.classes ||
        data?.teachers?.classes ||
        [];

    if (Array.isArray(values)) {
        return values.map(String);
    }

    if (values && typeof values === "object") {
        return Object.keys(values);
    }

    return [];
}


function getDayLessonNumbers(day) {
    const subjectGrid =
        state.data?.subjects?.grid?.[day] || {};

    const teacherGrid =
        state.data?.teachers?.grid?.[day] || {};

    return sortLessonNumbers([
        ...new Set([
            ...Object.keys(subjectGrid),
            ...Object.keys(teacherGrid)
        ])
    ]);
}


/* =========================================
   9. CLASS SCHEDULE
   ========================================= */

function extractLessons() {
    if (!state.data || !state.selectedClass) {
        return [];
    }

    const lessonNumbers =
        getDayLessonNumbers(state.selectedDay);

    const result = [];

    for (const sourceNumber of lessonNumbers) {
        const subjectCell =
            getCell(
                state.data.subjects,
                state.selectedDay,
                sourceNumber,
                state.selectedClass
            ) || {};

        const teacherCell =
            getCell(
                state.data.teachers,
                state.selectedDay,
                sourceNumber,
                state.selectedClass
            ) || {};

        const room = getRoom(subjectCell, teacherCell);

        let subject = toText(subjectCell.raw)
            .split("\n")[0]
            .trim();

        let teacher =
            toText(teacherCell.names) ||
            toText(subjectCell.teacher);

        subject = removeRoomSuffix(subject, room);
        teacher = removeRoomSuffix(teacher, room);

        if (!subject && !teacher && !room) {
            continue;
        }

        const searchable =
            `${subject} ${teacher} ${room}`.toLowerCase();

        if (
            state.query &&
            !searchable.includes(state.query.toLowerCase())
        ) {
            continue;
        }

        const info = getLessonInfo(
            sourceNumber,
            state.selectedClass,
            state.selectedDay
        );

        const items = subjectCell.items || null;
        const teacherItems = teacherCell.items || subjectCell.teacherItems || null;
        const roomItems = teacherCell.roomItems || subjectCell.roomItems || null;

        result.push({
            number: info.lessonNumber,
            sourceNumber,

            subject: subject || "Предмет не указан",
            teacher,
            room,

            time: getLessonTime(
                sourceNumber,
                state.selectedClass,
                state.selectedDay
            ),

            exchange: !!subjectCell.exchange || !!teacherCell.exchange,
            canceled: !!subjectCell.canceled || !!teacherCell.canceled,

            items,
            teacherItems,
            roomItems
        });
    }

    return result;
}


function updateDayTabs() {
    if (!el.tabs) return;

    el.tabs.querySelectorAll("[data-day]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.day === state.selectedDay
        );
    });
}


function render() {
    if (!state.data || !el.list) return;

    const lessons = extractLessons();

    if (el.title) {
        el.title.textContent =
            `Расписание · ${state.selectedClass}`;
    }

    if (el.caption) {
        el.caption.textContent =
            dayNames[state.selectedDay] || state.selectedDay;
    }

    if (el.count) {
        el.count.textContent =
            `${lessons.length} ${lessonWord(lessons.length)}`;
    }

    updateDayTabs();

    if (!lessons.length) {
        el.list.innerHTML = `
            <div class="empty-state">
                <strong>
                    ${state.query
                        ? "Ничего не найдено"
                        : "На этот день уроков нет"}
                </strong>

                <p>
                    ${state.query
                        ? "Попробуй изменить поисковый запрос."
                        : "Выбери другой день недели."}
                </p>
            </div>
        `;

        return;
    }

    el.list.innerHTML = lessons.map(item => {
        let subjectHtml = "";
        let teacherHtml = "";
        let roomHtml = "";

        if (item.items && item.items.length) {
            subjectHtml = item.items.map(it => {
                const cls = it.canceled ? "canceled-line" : "";
                return `<span class="${cls}">${escapeHtml(it.name)}</span>`;
            }).join(" / ");

            const teachersList = item.items
                .map(it => it.teacher)
                .filter(Boolean);
            teacherHtml = teachersList.map((name, idx) => {
                const canceled = item.items[idx]?.canceled;
                const cls = canceled ? "canceled-line" : "";
                return `<span class="${cls}">${escapeHtml(name)}</span>`;
            }).join(", ");

            const roomsList = item.items
                .map(it => it.room)
                .filter(Boolean);
            roomHtml = roomsList.map((name, idx) => {
                const canceled = item.items[idx]?.canceled;
                const cls = canceled ? "canceled-line" : "";
                return `<span class="${cls}">${escapeHtml(name)}</span>`;
            }).join("<span class=\"room-sep\">,&nbsp;</span>");
        } else {
            subjectHtml = escapeHtml(item.subject);
            teacherHtml = item.teacher
                ? `Учитель: ${escapeHtml(item.teacher)}`
                : "Учитель не указан";
            roomHtml = item.room
                ? `${escapeHtml(item.room)}`
                : "";
        }

        const cardClass = item.canceled
            ? "is-canceled"
            : (item.exchange ? "is-exchange" : "");

        return `
        <article class="lesson-card ${cardClass}">

            <div class="lesson-number">
                ${escapeHtml(item.number)}
            </div>

            <div class="lesson-main">

                <h3>${subjectHtml}</h3>

                <p>
                    ${teacherHtml || "Учитель не указан"}
                </p>

            </div>

            <div class="lesson-room">

                ${item.time
                    ? `<span class="lesson-time">${escapeHtml(item.time)}</span>`
                    : ""}

                ${roomHtml
                    ? `<strong class="room-badge">${roomHtml}</strong>`
                    : ""}

            </div>

        </article>
        `;
    }).join("");
}


/* =========================================
   10. FAVORITE CLASSES
   ========================================= */

function saveFavorites() {
    try {
        localStorage.setItem(
            "favorite-classes",
            JSON.stringify(state.favoriteClasses)
        );
    } catch (error) {
        console.error("Не удалось сохранить избранное:", error);
    }
}


function isFavorite(className) {
    return state.favoriteClasses.includes(className);
}


function toggleFavorite(className) {
    if (!className) return;

    if (isFavorite(className)) {
        state.favoriteClasses =
            state.favoriteClasses.filter(
                name => name !== className
            );
    } else {
        state.favoriteClasses.push(className);
    }

    saveFavorites();

    renderFavorites();
    updateFavoriteButton();
}


function renderFavorites() {
    const favorites = state.favoriteClasses;

    if (el.favoritesList) {
        el.favoritesList.innerHTML = favorites.length
            ? favorites.map(className => `
                <button
                    type="button"
                    class="favorite-item ${className === state.selectedClass ? "active" : ""}"
                    data-favorite-class="${escapeHtml(className)}"
                >
                    <span class="favorite-icon">★</span>
                    <span>${escapeHtml(className)}</span>
                </button>
            `).join("")
            : `
                <p class="favorites-empty">
                    Пока нет избранных классов
                </p>
            `;
    }

    if (el.favoritesMobileList) {
        el.favoritesMobileList.innerHTML = favorites.length
            ? favorites.map(className => `
                <button
                    type="button"
                    class="favorite-item ${className === state.selectedClass ? "active" : ""}"
                    data-favorite-class="${escapeHtml(className)}"
                >
                    <span class="favorite-icon">★</span>
                    <span>${escapeHtml(className)}</span>
                </button>
            `).join("")
            : `
                <div class="empty-state">
                    <strong>Пока нет избранных классов</strong>
                    <p>
                        Открой расписание нужного класса
                        и нажми на звёздочку, чтобы добавить его сюда.
                    </p>
                </div>
            `;
    }
}


function updateFavoriteButton() {
    if (!el.favoriteToggle) return;

    const active = isFavorite(state.selectedClass);

    el.favoriteToggle.classList.toggle("active", active);

    el.favoriteToggle.textContent = active
        ? "★ В избранном"
        : "☆ В избранное";

    el.favoriteToggle.title = active
        ? "Убрать из избранного"
        : "Добавить в избранное";

    el.favoriteToggle.setAttribute(
        "aria-label",
        el.favoriteToggle.title
    );
}


function selectFavoriteClass(className) {
    if (!className) return;

    state.selectedClass = className;
    state.query = "";

    if (el.classSelect) {
        el.classSelect.value = className;
    }

    if (el.search) {
        el.search.value = "";
    }

    render();
    renderFavorites();
    updateFavoriteButton();

    showView("schedule");
}


/* =========================================
   11. CLASS SELECT
   ========================================= */

function fillClasses() {
    if (!el.classSelect) return;

    const classes = getClassNames(state.data);

    if (!classes.length) {
        state.selectedClass = "";

        el.classSelect.innerHTML = `
            <option value="">Классы не найдены</option>
        `;

        el.classSelect.disabled = true;

        showNotice(
            "Список классов не найден в ответе API.",
            "error"
        );

        renderFavorites();

        return;
    }

    el.classSelect.disabled = false;

    el.classSelect.innerHTML = classes.map(name => `
        <option value="${escapeHtml(name)}">
            ${escapeHtml(name)}
        </option>
    `).join("");

    if (!classes.includes(state.selectedClass)) {
        state.selectedClass =
            state.favoriteClasses.find(name =>
                classes.includes(name)
            ) || classes[0];
    }

    el.classSelect.value = state.selectedClass;

    state.favoriteClasses =
        state.favoriteClasses.filter(name =>
            classes.includes(name)
        );

    saveFavorites();

    renderFavorites();
    updateFavoriteButton();
}


/* =========================================
   12. TEACHER SEARCH
   ========================================= */

function getTeacherNames(value) {
    if (Array.isArray(value)) {
        return value.flatMap(getTeacherNames);
    }

    if (value == null) {
        return [];
    }

    return String(value)
        .split(/[,;\n]+/)
        .map(name => name.trim())
        .filter(Boolean);
}


function getAllTeacherNames() {
    const result = new Set();

    const grid = state.data?.teachers?.grid || {};

    for (const day of days) {
        const dayGrid = grid[day] || {};

        for (const lesson of Object.values(dayGrid)) {
            for (const cell of Object.values(lesson || {})) {
                const room = normalizeRoom(cell?.rooms);

                for (let name of getTeacherNames(cell?.names)) {
                    name = removeRoomSuffix(name, room);

                    if (name) {
                        result.add(name);
                    }
                }
            }
        }
    }

    return [...result].sort((a, b) =>
        a.localeCompare(b, "ru")
    );
}


function fillTeacherList() {
    if (!el.teacherList) return;

    el.teacherList.innerHTML =
        getAllTeacherNames().map(name => `
            <option value="${escapeHtml(name)}"></option>
        `).join("");
}


function getTeacherLessons(day, teacherQuery) {
    const result = [];

    const teacherGrid =
        state.data?.teachers?.grid?.[day] || {};

    const numbers = sortLessonNumbers(
        Object.keys(teacherGrid)
    );

    const query = teacherQuery.toLowerCase();

    for (const sourceNumber of numbers) {
        const lesson = teacherGrid[sourceNumber] || {};

        for (const [className, teacherCell] of Object.entries(lesson)) {
            const subjectCell =
                getCell(
                    state.data.subjects,
                    day,
                    sourceNumber,
                    className
                ) || {};

            const room = getRoom(subjectCell, teacherCell);

            const teacherNames = getTeacherNames(
                teacherCell?.names
            ).map(name => removeRoomSuffix(name, room));

            const matchingTeachers = teacherNames.filter(name =>
                name.toLowerCase().includes(query)
            );

            if (!matchingTeachers.length) {
                continue;
            }

            let subject = toText(subjectCell.raw)
                .split("\n")[0]
                .trim();

            subject = removeRoomSuffix(subject, room);

            const info = getLessonInfo(
                sourceNumber,
                className,
                day
            );

            const time = getLessonTime(
                sourceNumber,
                className,
                day
            );

            for (const teacher of matchingTeachers) {
                result.push({
                    number: info.lessonNumber,
                    sourceNumber,

                    className,
                    teacher,

                    subject: subject || "Предмет не указан",
                    room,
                    time,

                    exchange: !!subjectCell.exchange || !!teacherCell.exchange,
                    canceled: !!subjectCell.canceled || !!teacherCell.canceled,

                    items: subjectCell.items || null,
                    teacherItems: teacherCell.items || subjectCell.teacherItems || null,
                    roomItems: teacherCell.roomItems || subjectCell.roomItems || null
                });
            }
        }
    }

    return result;
}


function getTeacherWeekCount(teacherName) {
    let total = 0;

    for (const day of days) {
        const lessons = getTeacherLessons(day, teacherName);

        total += lessons.filter(lesson =>
            lesson.teacher.toLowerCase() ===
            teacherName.toLowerCase()
        ).length;
    }

    return total;
}


function updateTeacherTabs() {
    if (!el.teacherTabs) return;

    el.teacherTabs.querySelectorAll("[data-day]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.day === state.teacherDay
        );
    });
}


function renderTeacherResults() {
    if (!state.data || !el.teacherResults) return;

    const query = state.teacherQuery.trim();

    updateTeacherTabs();

    if (!query) {
        if (el.teacherTitle) {
            el.teacherTitle.textContent = "Выберите учителя";
        }

        if (el.teacherCaption) {
            el.teacherCaption.textContent =
                "Введите имя или фамилию учителя";
        }

        if (el.teacherCount) {
            el.teacherCount.textContent = "";
        }

        el.teacherResults.innerHTML = `
            <div class="empty-state">
                <strong>Поиск учителя</strong>
                <p>Начни вводить имя или фамилию учителя.</p>
            </div>
        `;

        return;
    }

    const lessons = getTeacherLessons(
        state.teacherDay,
        query
    );

    const exactTeacher = getAllTeacherNames().find(name =>
        name.toLowerCase() === query.toLowerCase()
    );

    if (el.teacherTitle) {
        el.teacherTitle.textContent = exactTeacher || query;
    }

    if (el.teacherCaption) {
        el.teacherCaption.textContent =
            `${dayNames[state.teacherDay]} · ${lessons.length} ${lessonWord(lessons.length)}`;
    }

    if (el.teacherCount) {
        el.teacherCount.textContent =
            `${lessons.length} ${lessonWord(lessons.length)}`;
    }

    if (!lessons.length) {
        el.teacherResults.innerHTML = `
            <div class="empty-state">
                <strong>Уроки не найдены</strong>
                <p>
                    Попробуй выбрать другой день
                    или проверить написание имени.
                </p>
            </div>
        `;

        return;
    }

    el.teacherResults.innerHTML = lessons.map(item => {
        let subjectHtml = "";
        let roomHtml = "";

        if (item.items && item.items.length) {
            subjectHtml = item.items.map(it => {
                const cls = it.canceled ? "canceled-line" : "";
                return `<span class="${cls}">${escapeHtml(it.name)}</span>`;
            }).join(" / ");

            const roomsList = item.items
                .map(it => it.room)
                .filter(Boolean);
            roomHtml = roomsList.map((name, idx) => {
                const canceled = item.items[idx]?.canceled;
                const cls = canceled ? "canceled-line" : "";
                return `<span class="${cls}">${escapeHtml(name)}</span>`;
            }).join("<span class=\"room-sep\">, </span>");
        } else {
            subjectHtml = escapeHtml(item.subject);
            roomHtml = item.room
                ? `${escapeHtml(item.room)}`
                : "";
        }

        const cardClass = item.canceled
            ? "is-canceled"
            : (item.exchange ? "is-exchange" : "");

        return `
        <article class="teacher-lesson-card ${cardClass}">

            <div class="teacher-lesson-number">
                ${escapeHtml(item.number)}
            </div>

            <div class="teacher-lesson-main">

                <div class="teacher-lesson-class">
                    ${escapeHtml(item.className)}
                </div>

                <div class="teacher-lesson-subject">
                    ${subjectHtml}
                </div>

                ${item.time
                    ? `
                        <div class="lesson-time">
                            ${escapeHtml(item.time)}
                        </div>
                    `
                    : ""}

            </div>

            <div class="teacher-lesson-room">
                ${roomHtml
                    ? `<span class="room-badge">${roomHtml}</span>`
                    : ""}
            </div>

        </article>
        `;
    }).join("");

    if (exactTeacher) {
        const weekCount = getTeacherWeekCount(exactTeacher);

        el.teacherResults.insertAdjacentHTML(
            "beforeend",
            `
                <p class="teacher-week-summary">
                    ${escapeHtml(exactTeacher)}:
                    ${weekCount} ${lessonWord(weekCount)} в неделю
                </p>
            `
        );
    }
}


/* =========================================
   13. PAGE NAVIGATION
   ========================================= */

function showView(view) {
    if (!["schedule", "favorites", "teachers"].includes(view)) {
        view = "schedule";
    }

    state.currentView = view;

    if (el.dashboard) {
        el.dashboard.hidden = view !== "schedule";
    }

    if (el.favoritesView) {
        el.favoritesView.hidden = view !== "favorites";
    }

    if (el.teachersView) {
        el.teachersView.hidden = view !== "teachers";
    }

    document.querySelectorAll(
        ".nav-item, .mobile-nav a"
    ).forEach(link => {
        const href = link.getAttribute("href");

        link.classList.toggle(
            "active",
            href === `#${view}`
        );
    });

    const headerContent = {
        schedule: {
            title: "Расписание",
            subtitle: "Всё необходимое для учебной недели"
        },
        favorites: {
            title: "Избранное",
            subtitle: "Твои сохранённые классы"
        },
        teachers: {
            title: "Учителя",
            subtitle: "Расписание преподавателей"
        }
    };

    if (el.headerTitle) {
        el.headerTitle.textContent =
            headerContent[view].title;
    }

    if (el.headerSubtitle) {
        el.headerSubtitle.textContent =
            headerContent[view].subtitle;
    }

    if (view === "favorites") {
        renderFavorites();
    }

    if (view === "teachers") {
        renderTeacherResults();
    }
}


/* =========================================
   14. THEME
   ========================================= */

function applyTheme(theme) {
    const selectedTheme =
        theme === "dark" ? "dark" : "light";

    document.documentElement.dataset.theme =
        selectedTheme;

    if (el.theme) {
        el.theme.textContent =
            selectedTheme === "dark" ? "☀" : "☾";

        el.theme.title =
            selectedTheme === "dark"
                ? "Включить светлую тему"
                : "Включить тёмную тему";

        el.theme.setAttribute(
            "aria-label",
            el.theme.title
        );
    }

    try {
        localStorage.setItem(
            "schedule-theme",
            selectedTheme
        );
    } catch (error) {
        console.warn("Не удалось сохранить тему:", error);
    }
}


function initializeTheme() {
    let savedTheme = null;

    try {
        savedTheme = localStorage.getItem("schedule-theme");
    } catch {
        savedTheme = null;
    }

    const systemPrefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

    applyTheme(
        savedTheme || (systemPrefersDark ? "dark" : "light")
    );
}


function toggleTheme() {
    const current =
        document.documentElement.dataset.theme;

    applyTheme(
        current === "dark" ? "light" : "dark"
    );
}


/* =========================================
   15. LOAD SCHEDULE
   ========================================= */

async function loadSchedule() {
    if (el.reload) {
        el.reload.disabled = true;
        el.reload.textContent = "↻";
    }

    showNotice("");
    setConnection("loading", "Подключение…");

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Сервер ответил HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (
            !data ||
            !data.subjects ||
            !data.teachers
        ) {
            throw new Error(
                "В ответе API отсутствуют subjects или teachers."
            );
        }

        state.data = data;

        fillClasses();
        fillTeacherList();

        if (el.updated) {
            el.updated.textContent = formatDate(
                data.updated_at ||
                data.updated ||
                data.timestamp
            );
        }

        setConnection("online", "API подключён");

        showNotice("");

        render();
        renderFavorites();
        updateFavoriteButton();
        renderTeacherResults();

        if (!state.initialViewSelected) {
            state.initialViewSelected = true;

            if (!state.userSelectedView) {
                showView(
                    state.favoriteClasses.length
                        ? "favorites"
                        : "schedule"
                );
            }
        }

    } catch (error) {
        console.error(
            "Ошибка загрузки расписания:",
            error
        );

        setConnection("offline", "Нет подключения");

        if (el.updated) {
            el.updated.textContent =
                "Не удалось получить данные";
        }

        if (el.list) {
            el.list.innerHTML = `
                <div class="empty-state">
                    <strong>Не удалось загрузить расписание</strong>
                    <p>${escapeHtml(error.message)}</p>
                </div>
            `;
        }

        showNotice(
            "Не удалось получить расписание. Проверь подключение и попробуй обновить страницу.",
            "error"
        );

    } finally {
        if (el.reload) {
            el.reload.disabled = false;
            el.reload.textContent = "↻";
        }
    }
}


/* =========================================
   16. EVENT LISTENERS
   ========================================= */

if (el.classSelect) {
    el.classSelect.addEventListener("change", event => {
        state.selectedClass = event.target.value;

        render();
        renderFavorites();
        updateFavoriteButton();
    });
}


if (el.search) {
    el.search.addEventListener("input", event => {
        state.query = event.target.value.trim();

        render();
    });
}


if (el.tabs) {
    el.tabs.addEventListener("click", event => {
        const button = event.target.closest("[data-day]");

        if (!button) return;

        state.selectedDay = button.dataset.day;

        updateDayTabs();
        render();
    });
}


if (el.favoriteToggle) {
    el.favoriteToggle.addEventListener("click", () => {
        toggleFavorite(state.selectedClass);
    });
}


document.addEventListener("click", event => {
    const favorite = event.target.closest(
        "[data-favorite-class]"
    );

    if (!favorite) return;

    const className = favorite.dataset.favoriteClass;

    selectFavoriteClass(className);
});


if (el.teacherSearch) {
    el.teacherSearch.addEventListener("input", event => {
        state.teacherQuery = event.target.value.trim();

        renderTeacherResults();
    });
}


if (el.teacherTabs) {
    el.teacherTabs.addEventListener("click", event => {
        const button = event.target.closest("[data-day]");

        if (!button) return;

        state.teacherDay = button.dataset.day;

        renderTeacherResults();
    });
}


if (el.reload) {
    el.reload.addEventListener("click", loadSchedule);
}


document.addEventListener("click", event => {
    const link = event.target.closest(
        ".nav-item, .mobile-nav a"
    );

    if (!link) return;

    const href = link.getAttribute("href");

    if (!href || !href.startsWith("#")) return;

    const view = href.slice(1);

    if (
        !["schedule", "favorites", "teachers"].includes(view)
    ) {
        return;
    }

    event.preventDefault();

    state.userSelectedView = true;

    showView(view);
});


if (el.theme) {
    el.theme.addEventListener("click", toggleTheme);
}


/* =========================================
   17. INITIALIZATION
   ========================================= */

function initializeApp() {
    initializeTheme();

    renderFavorites();
    updateFavoriteButton();

    showView("schedule");

    loadSchedule();
}

initializeApp();