
/* =========================
   Shall we? script.js
========================= */

/* ---------- 공통 설정 ---------- */

const $ = (selector) => document.querySelector(selector);

function loadStorage(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : JSON.parse(saved);
    } catch (error) {
        console.warn(`${key} 데이터를 불러오지 못했어요.`, error);
        return fallback;
    }
}

function saveStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`${key} 데이터를 저장하지 못했어요.`, error);
        alert("저장 공간이 부족할 수 있어요. 사진을 줄인 뒤 다시 시도해 주세요.");
        return false;
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return `${year}년 ${month}월 ${day}일`;
}

function getTodayKey() {
    return getDateKey(new Date());
}


/* ---------- 화면 전환 ---------- */

function showPage(pageName) {
    document.querySelectorAll(".page").forEach((page) => {
        page.style.display = "none";
    });

    const target = document.getElementById(pageName);


    // 현재 선택한 페이지의 하단 메뉴 강조
    document.querySelectorAll(".tab-bar button").forEach((button) => {
        const isActive = button.getAttribute("onclick") === `showPage('${pageName}')`;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-current", isActive ? "page" : "false");
    });


    if (target) {
        target.style.display = pageName === "home" ? "flex" : "block";
    }

if (pageName === "history" && target) {
  target.classList.remove("history-enter");

  // 브라우저가 기존 상태를 적용한 다음 애니메이션 시작
  void target.offsetWidth;

  target.classList.add("history-enter");
}


    if (pageName === "history") {
        updateHistory();
        updateWeeklySummary();
    }

    if (pageName === "diary") {
        renderCalendar();
        loadSelectedDiary();
    }


    document.querySelectorAll(".tab-bar button").forEach((button) => {
        const isActive =
            button.getAttribute("onclick") === `showPage('${pageName}')`;

        button.classList.toggle("active", isActive);
    });

}


/* ---------- 시간 표시 ---------- */

function updateTime() {
    const timeElement = $("#time");

    if (!timeElement) return;

    const now = new Date();

    timeElement.textContent = now.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function updateTimePeriod() {
    const home = $("#home");

    if (!home) return;

    const hour = new Date().getHours();

    home.classList.remove(
        "dawn",
        "morning",
        "day",
        "sunset",
        "night",
        "midnight"
    );

    let period;

    if (hour >= 5 && hour < 7) {
        period = "dawn";
    } else if (hour >= 7 && hour < 11) {
        period = "morning";
    } else if (hour >= 11 && hour < 17) {
        period = "day";
    } else if (hour >= 17 && hour < 20) {
        period = "sunset";
    } else if (hour >= 20 && hour < 24) {
        period = "night";
    } else {
        period = "midnight";
    }

    home.classList.add(period);
}


/* ---------- 위치와 날씨 ---------- */

let currentLatitude = null;
let currentLongitude = null;
let locationRequestInProgress = false;

async function getPlaceName(latitude, longitude) {
    try {
        const url =
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
            `&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=ko`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("위치 이름을 불러오지 못했어요.");
        }

        const data = await response.json();
        const address = data.address || {};

        return (
            address.suburb ||
            address.city_district ||
            address.city ||
            address.town ||
            address.county ||
            address.state ||
            "현재 위치"
        );
    } catch (error) {
        console.warn("지역 이름 확인 실패:", error);
        return "현재 위치";
    }
}

async function getWeather(latitude, longitude) {
    const weatherElement = $("#weather");

    if (!weatherElement) return;

    try {
        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude}&longitude=${longitude}` +
            `&current=temperature_2m,weather_code` +
            `&timezone=auto`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("날씨 정보를 불러오지 못했어요.");
        }

        const data = await response.json();
        const current = data.current;

        const temperature = Math.round(current.temperature_2m);
        const code = current.weather_code;

        let description = "날씨를 확인해 주세요";

        if (code === 0) {
            description = "맑음 ☀️";
        } else if ([1, 2].includes(code)) {
            description = "대체로 맑음 🌤️";
        } else if (code === 3) {
            description = "흐림 ☁️";
        } else if ([45, 48].includes(code)) {
            description = "안개 🌫️";
        } else if ([51, 53, 55, 56, 57].includes(code)) {
            description = "이슬비 🌦️";
        } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
            description = "비 🌧️";
        } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
            description = "눈 ❄️";
        } else if ([95, 96, 99].includes(code)) {
            description = "뇌우 ⛈️";
        }

        weatherElement.textContent =
            `${description} · ${temperature}°C`;
    } catch (error) {
        console.warn("날씨 확인 실패:", error);
        weatherElement.textContent = "날씨 정보를 확인할 수 없어요.";
    }
}

function getLocation(forceRefresh = false) {
    const locationElement = $("#location");

    if (!locationElement) return;

    if (locationRequestInProgress) return;

    if (!navigator.geolocation) {
        locationElement.textContent = "이 브라우저에서는 위치 기능을 사용할 수 없어요.";
        return;
    }

    locationRequestInProgress = true;
    locationElement.textContent = "위치를 확인하는 중...";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            currentLatitude = position.coords.latitude;
            currentLongitude = position.coords.longitude;

            try {
                const placeName = await getPlaceName(
                    currentLatitude,
                    currentLongitude
                );

                locationElement.textContent = placeName;

                await getWeather(
                    currentLatitude,
                    currentLongitude
                );
            } finally {
                locationRequestInProgress = false;
            }
        },
        (error) => {
            console.warn("위치 확인 실패:", error);

            if (error.code === error.PERMISSION_DENIED) {
                locationElement.textContent = "위치 권한을 허용하면 지역을 확인할 수 있어요.";
            } else {
                locationElement.textContent = "위치를 확인할 수 없어요.";
            }

            const weatherElement = $("#weather");

            if (weatherElement) {
                weatherElement.textContent = "위치 권한을 확인해 주세요.";
            }

            locationRequestInProgress = false;
        },
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: forceRefresh ? 0 : 300000
        }
    );
}

function refreshLocation() {
    getLocation(true);
}


/* ---------- 오늘의 활동 추천 ---------- */

const activities = [
    "좋아하는 노래 한 곡 듣기",
    "따뜻한 음료 마시며 쉬기",
    "창밖 풍경 구경하기",
    "새로운 간식 먹어 보기",
    "오늘의 사진 한 장 찍기",
    "가족에게 먼저 말 걸기",
    "친구에게 안부 보내기",
    "좋아하는 노래에 맞춰 춤추기",
    "방 한 곳만 정리하기",
    "간단한 요리 만들어 보기",
    "평소와 다른 길로 걸어 보기",
    "하늘 사진 찍기",
    "좋아하는 책 몇 쪽 읽기",
    "오늘 좋았던 일 하나 적기",
    "새로운 그림 그려 보기",
    "스트레칭하며 몸 풀기",
    "평소 안 먹던 음식 도전하기",
    "가고 싶은 장소 찾아보기",
    "나에게 짧은 편지 쓰기",
    "잠깐 휴대폰 내려놓고 쉬기",
    "좋아하는 영상 하나 보기",
    "책상 위 물건 정리하기",
    "내일 입을 옷 골라 두기",
    "새로운 취미 검색해 보기",
        "좋아하는 노래 가사 없이 멜로디만 들어 보기",
    "새로운 플레이리스트 만들어 보기",
    "예전에 좋아했던 노래 다시 듣기",
    "오늘의 기분을 색깔로 표현하기",
    "마음에 드는 사진으로 배경화면 바꾸기",
    "휴대폰 앨범에서 추억의 사진 찾아보기",
    "오늘 본 예쁜 장면 기억해 두기",
    "구름 모양 관찰하기",
    "해 질 무렵 하늘 바라보기",
    "창문을 열고 바깥 공기 느끼기",
    "좋아하는 향기 찾아보기",
    "따뜻한 물 한 잔 마시기",
    "평소 좋아하는 간식 예쁘게 담아 먹기",
    "냉장고 속 재료로 만들 수 있는 음식 찾아보기",
    "간단한 디저트 레시피 저장하기",
    "새로운 음료 조합 생각해 보기",
    "가족이 좋아하는 음식 물어보기",
    "가족에게 고마웠던 일 말하기",
    "친구와 있었던 재미있는 일 떠올리기",
    "친구에게 오늘 재미있었던 일 물어보기",
    "오랜만에 연락하고 싶은 사람 떠올리기",
    "누군가에게 짧은 응원 메시지 보내기",
    "최근에 들은 칭찬 기억해 보기",
    "내가 잘하는 것 세 가지 적기",
    "요즘 관심 있는 것 다섯 가지 적기",
    "나중에 해 보고 싶은 일 적기",
    "가 보고 싶은 여행지 찾아보기",
    "언젠가 가고 싶은 장소를 지도에 저장하기",
    "미래의 나에게 한 문장 남기기",
    "오늘 가장 기억에 남는 순간 적기",
    "오늘 나를 웃게 한 일 떠올리기",
    "오늘 처음 알게 된 것 하나 적기",
    "궁금했던 단어의 뜻 찾아보기",
    "흥미로운 과학 사실 하나 알아보기",
    "평소 궁금했던 질문 하나 검색하기",
    "새로운 나라의 문화 알아보기",
    "좋아하는 영화나 드라마 명장면 떠올리기",
    "보고 싶은 영화 목록 만들기",
    "새로운 웹툰 한 편 찾아보기",
    "마음에 드는 책 표지 찾아보기",
    "간단한 낙서로 오늘 기분 그리기",
    "좋아하는 캐릭터 그려 보기",
    "종이에 작은 별이나 꽃 그리기",
    "마음에 드는 색 조합 세 가지 찾기",
    "방 안의 작은 물건 위치 바꿔 보기",
    "책상 위에 좋아하는 물건 하나 놓기",
    "가방 속 물건 정리하기",
    "자주 쓰는 물건의 자리 정해 주기",
    "내일 해야 할 일 하나만 적어 두기",
    "오늘의 나에게 수고했다고 말해 주기",
    "좋아하는 노래의 분위기를 한 단어로 표현하기",
    "새로운 아티스트의 노래 한 곡 들어 보기",
    "노래 세 곡으로 오늘의 플레이리스트 만들기",
    "좋아하는 아이돌의 무대 영상 찾아보기",
    "마음에 드는 앨범 커버 저장하기",
    "나만의 가상 앨범 제목 정해 보기",
    "좋아하는 노래에 어울리는 색깔 고르기",
    "영화 예고편 하나 감상하기",
    "좋아하는 작품의 뒷결말을 상상해 보기",
    "마음에 드는 문장 하나 수집하기",
    "새로운 영어 표현 하나 알아보기",
    "다른 나라의 인사말 배워 보기",
    "간단한 종이접기 하나 따라 하기",
    "종이로 작은 편지 봉투 접기",
    "손글씨로 내 이름 써 보기",
    "좋아하는 문장을 예쁘게 적어 보기",
    "작은 메모지에 응원 문구 쓰기",
    "책갈피로 쓸 그림 그리기",
    "휴대폰 사진에 어울리는 제목 붙이기",
    "주변에서 같은 색 물건 다섯 개 찾기",
    "집 안에서 동그란 모양 찾아보기",
    "오늘 발견한 작은 변화 하나 적기",
    "평소 지나치던 풍경 자세히 관찰하기",
    "식물이나 꽃의 생김새 관찰하기",
    "새소리나 주변의 자연 소리 들어 보기",
    "하루 동안 감사했던 일 하나 떠올리기",
    "지금 나에게 필요한 말 한마디 적기",
    "최근에 용기 냈던 순간 떠올리기",
    "예전보다 나아진 점 하나 찾아보기",
    "실수해도 괜찮았던 경험 떠올리기",
    "앞으로 배우고 싶은 기술 하나 정하기",
    "관심 있는 직업의 하루를 상상해 보기",
    "미래의 내 방을 상상해서 그려 보기",
    "나만의 작은 브랜드 이름 만들어 보기",
    "간단한 철학용어 하나 알아보기",
];

let currentSuggestion = "";

function showRandomActivity() {
    const suggestionElement = $("#suggestion");

    if (!suggestionElement || activities.length === 0) return;

    let nextActivity = currentSuggestion;

    if (activities.length > 1) {
        while (nextActivity === currentSuggestion) {
            nextActivity = activities[
                Math.floor(Math.random() * activities.length)
            ];
        }
    } else {
        nextActivity = activities[0];
    }

    currentSuggestion = nextActivity;
    suggestionElement.textContent = currentSuggestion;
}

$("#randomButton")?.addEventListener("click", showRandomActivity);


/* ---------- 활동 기록과 즐겨찾기 ---------- */

let activityHistory = loadStorage("activityHistory", []);
let favoriteActivities = loadStorage("favoriteActivities", []);

if (!Array.isArray(activityHistory)) activityHistory = [];
if (!Array.isArray(favoriteActivities)) favoriteActivities = [];

function isFavorite(activity) {
    return favoriteActivities.includes(activity);
}

function toggleFavorite(activity) {
    if (isFavorite(activity)) {
        favoriteActivities = favoriteActivities.filter(
            (item) => item !== activity
        );
    } else {
        favoriteActivities.push(activity);
    }

    saveStorage("favoriteActivities", favoriteActivities);
    updateHistory();
}

function addActivity(text, dateKey = getTodayKey()) {
    const cleanedText = text.trim();

    if (!cleanedText) {
        alert("기록할 내용을 입력해 주세요");
        return false;
    }

    activityHistory.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: cleanedText,
        date: dateKey,
        createdAt: new Date().toISOString()
    });

    if (!saveStorage("activityHistory", activityHistory)) {
        activityHistory.shift();
        return false;
    }

    updateHistory();
    updateWeeklySummary();

    return true;
}



function updateHistory() {
    const historyList = $("#historyList");

    if (!historyList) return;

    if (activityHistory.length === 0) {
        historyList.innerHTML =
            '<p class="empty-history">아직 기록이 없어요.. 작은 일부터 해보기!</p>';
        return;
    }

    const groupedHistory = {};

    activityHistory.forEach((item) => {
        const text = typeof item === "string" ? item : item.text;
        const date = typeof item === "string"
            ? getTodayKey()
            : item.date || getTodayKey();

        if (!groupedHistory[date]) {
            groupedHistory[date] = [];
        }

        groupedHistory[date].push(text);
    });

    const sortedDates = Object.keys(groupedHistory).sort((a, b) =>
        b.localeCompare(a)
    );

    historyList.innerHTML = sortedDates.map((date) => `
        <article class="history-card">
            <span class="history-date">
                ${escapeHTML(date.slice(5).replace("-", "/"))}
            </span>

            <div class="history-activities">
                ${groupedHistory[date].map((text) => `
                    <p>• ${escapeHTML(text)}</p>
                `).join("")}
            </div>
        </article>
    `).join("");
}



/* ---------- 이번 주 통계 ---------- */


function getStartOfWeek(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    // 월요일부터 한 주를 시작해요.
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));

    return start;
}

function updateWeeklySummary() {
    const statsElement = $("#weeklyStats");
    const chartElement = $("#weeklyChart");

    if (!statsElement || !chartElement) return;

    const today = new Date();
    const weekStart = getStartOfWeek(today);
    const counts = Array(7).fill(0);

    activityHistory.forEach((item) => {
        const dateKey = typeof item === "string"
            ? getTodayKey()
            : item.date;

        if (!dateKey) return;

        const [year, month, day] = dateKey.split("-").map(Number);
        const activityDate = new Date(year, month - 1, day);
        activityDate.setHours(0, 0, 0, 0);

        const difference = Math.round(
            (activityDate - weekStart) / 86400000
        );

        if (difference >= 0 && difference < 7) {
            counts[difference]++;
        }
    });

    const total = counts.reduce((sum, count) => sum + count, 0);
    const activeDays = counts.filter((count) => count > 0).length;

    statsElement.innerHTML = `
        <div>
            <strong>${total}</strong>
            <p>이번 주 활동</p>
        </div>
        <div>
            <strong>${activeDays}</strong>
            <p>기록한 날</p>
        </div>
    `;

    const dayNames = ["월", "화", "수", "목", "금", "토", "일"];
    const maxCount = Math.max(1, ...counts);

    chartElement.innerHTML = counts.map((count, index) => {
        const height = count === 0 ? 0 : (count / maxCount) * 100;

        return `
            <div class="chart-row">
                <span class="chart-day">${dayNames[index]}</span>
                <div class="chart-track">
                    <div
                        class="chart-bar"
                        style="height: ${height}%"
                        title="${count}개 활동"
                    ></div>
                </div>
                <span class="chart-count">${count}</span>
            </div>
        `;
    }).join("");
}



/* ---------- 직접 활동 추가 ---------- */

$("#addActivityButton")?.addEventListener("click", () => {
    const input = $("#activityInput");

    if (!input) return;

    if (addActivity(input.value)) {
        input.value = "";
    }
});

$("#activityInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        $("#addActivityButton")?.click();
    }
});

$("#tryButton")?.addEventListener("click", () => {
    if (!currentSuggestion) {
        showRandomActivity();
        return;
    }

    const added = addActivity(currentSuggestion);

    if (added) {
        showRandomActivity();
    }
});



/* ---------- 일기 데이터 ---------- */

let calendarDate = new Date();
calendarDate.setDate(1);

let selectedCalendarDate = getTodayKey();
let selectedMood = null;
let selectedPhotos = [];

let diaryEntries = loadStorage("diaryEntries", {});

if (
    !diaryEntries ||
    typeof diaryEntries !== "object" ||
    Array.isArray(diaryEntries)
) {
    diaryEntries = {};
}

function getDiaryEntry(dateKey) {
    const entry = diaryEntries[dateKey];

    if (!entry) {
        return {
            text: "",
            mood: null,
            photos: []
        };
    }

    // 이전 버전에서 문자열로 저장된 일기도 읽기
    if (typeof entry === "string") {
        return {
            text: entry,
            mood: null,
            photos: []
        };
    }

    return {
        text: entry.text || "",
        mood: entry.mood || null,
        photos: Array.isArray(entry.photos) ? entry.photos : []
    };
}

function getDiaryData(dateKey) {
    return getDiaryEntry(dateKey);
}


/* ---------- 달력 표시 ---------- */

function renderCalendar() {
    const title = $("#monthTitle");
    const daysContainer = $("#calendarDays");

    if (!title || !daysContainer) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    title.textContent = `${year}년 ${month + 1}월`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const todayKey = getTodayKey();

    let html = "";

    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty" aria-hidden="true"></div>';
    }

    for (let day = 1; day <= lastDate; day++) {
        const dateKey = getDateKey(new Date(year, month, day));
        const diary = getDiaryEntry(dateKey);

        const classes = ["calendar-day"];

        if (dateKey === selectedCalendarDate) {
            classes.push("selected");
        }

        if (dateKey === todayKey) {
            classes.push("today");
        }

        if (diary.text || diary.mood || diary.photos.length > 0) {
            classes.push("has-diary");
        }

        if (new Date(year, month, day).getDay() === 0) {
            classes.push("sunday");
        }

        if (new Date(year, month, day).getDay() === 6) {
            classes.push("saturday");
        }

        html += `
            <button
                type="button"
                class="${classes.join(" ")}"
                data-date="${dateKey}"
                aria-label="${year}년 ${month + 1}월 ${day}일"
            >
                ${day}
            </button>
        `;
    }

    daysContainer.innerHTML = html;

    daysContainer.querySelectorAll("[data-date]").forEach((button) => {
        button.addEventListener("click", () => {
            selectedCalendarDate = button.dataset.date;
            renderCalendar();
            loadSelectedDiary();
        });
    });
}

$("#prevMonth")?.addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
});

$("#nextMonth")?.addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
});


/* ---------- 날짜별 일기 불러오기 ---------- */


function loadSelectedDiary() {
    const title = $("#diaryDateTitle");
    const textArea = $("#diaryText");
    const editor = $("#diaryEditor");

    if (!textArea) return;

    // 날짜를 선택하면 일기 작성 영역을 열어요.
    if (editor) {
        editor.hidden = false;
    }

    
    const nickname = localStorage.getItem("shallWeNickname") || "";
    const lastChar = nickname.charAt(nickname.length - 1);
    const code = lastChar.charCodeAt(0);

    const isHangul = code >= 0xAC00 && code <= 0xD7A3;
    const hasBatchim = isHangul && (code - 0xAC00) % 28 !== 0;

    let owner = "";

    if (nickname) {
        if (isHangul) {
            owner = nickname + (hasBatchim ? "이의" : "의");
        } else {
            owner = nickname + "의";
        }
    }

    
if (title) {
    const date = new Date(selectedCalendarDate + "T00:00:00");
    const month = date.getMonth() + 1;
    const day = date.getDate();

    title.textContent =
        `${month}월 ${day}일${owner ? " " + owner : ""} 일기`;
}



    const entry = getDiaryEntry(selectedCalendarDate);

    textArea.value = entry.text;
    selectedMood = entry.mood;
    selectedPhotos = [...entry.photos];

    document.querySelectorAll(".mood-button").forEach((button) => {
        const isSelected =
            Number(button.dataset.mood) === Number(selectedMood);

        button.classList.toggle("selected", isSelected);
        button.classList.toggle("active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });

    renderDiaryPhotos();
}




/* ---------- 기분 선택 ---------- */

const moodOptions = document.querySelector(".mood-options");

moodOptions?.addEventListener("click", (event) => {
    const button = event.target.closest(".mood-button");

    if (!button || !moodOptions.contains(button)) return;

    selectedMood = Number(button.dataset.mood);

    moodOptions.querySelectorAll(".mood-button").forEach((moodButton) => {
        const isSelected =
            Number(moodButton.dataset.mood) === selectedMood;

        moodButton.classList.toggle("selected", isSelected);
        moodButton.classList.toggle("active", isSelected);
        moodButton.setAttribute("aria-pressed", String(isSelected));
    });
});




/* ---------- 사진 미리보기와 자동 압축 ---------- */

function renderDiaryPhotos() {
    const preview = $("#diaryPhotoPreview");
    const photoSection = document.querySelector("#diary .photo-section");

    if (!preview || !photoSection) return;

    preview.innerHTML = selectedPhotos.map((photo) => `
        <img
            src="${photo}"
            alt="일기에 첨부한 사진"
        >
    `).join("");

    photoSection.classList.toggle(
        "has-photos",
        selectedPhotos.length > 0
    );
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const image = new Image();

            image.onload = () => {
                const maxSize = 1200;
                const scale = Math.min(
                    1,
                    maxSize / Math.max(image.width, image.height)
                );

                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));

                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("사진을 처리할 수 없어요."));
                    return;
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("사진 압축에 실패했어요."));
                            return;
                        }

                        const compressedReader = new FileReader();

                        compressedReader.onload = () => {
                            resolve(compressedReader.result);
                        };

                        compressedReader.onerror = () => {
                            reject(new Error("압축한 사진을 읽지 못했어요."));
                        };

                        compressedReader.readAsDataURL(blob);
                    },
                    "image/jpeg",
                    0.8
                );
            };

            image.onerror = () => {
                reject(new Error("사진 파일을 열 수 없어요."));
            };

            image.src = reader.result;
        };

        reader.onerror = () => {
            reject(new Error("사진 파일을 읽지 못했어요."));
        };

        reader.readAsDataURL(file);
    });
}

$("#diaryPhotos")?.addEventListener("change", async (event) => {
    const input = event.target;
    const files = Array.from(input.files || []);

    if (files.length === 0) return;

    const remaining = Math.max(0, 3 - selectedPhotos.length);

    if (remaining === 0) {
        alert("사진은 일기 하나당 최대 3장까지 첨부할 수 있어요.");
        input.value = "";
        return;
    }

    const chosenFiles = files.slice(0, remaining);

    if (files.length > remaining) {
        alert("사진은 최대 3장까지 첨부할 수 있어요.");
    }

    for (const file of chosenFiles) {
        if (!file.type.startsWith("image/")) {
            alert("이미지 파일만 첨부할 수 있어요.");
            continue;
        }

        try {
            const compressedPhoto = await compressImage(file);
            selectedPhotos.push(compressedPhoto);
            renderDiaryPhotos();
        } catch (error) {
            console.error("사진 처리 실패:", error);
            alert("사진을 처리하지 못했어요. 다른 사진으로 시도해 주세요.");
        }
    }

    input.value = "";
});



/* ---------- 일기 저장 ---------- */

$("#saveDiary")?.addEventListener("click", () => {
    const textArea = $("#diaryText");

    if (!textArea) return;

    const text = textArea.value.trim();

    if (!text && !selectedMood && selectedPhotos.length === 0) {
        const shouldDelete = confirm(
            "내용과 기분, 사진이 없어요. 이 날짜의 기존 일기를 삭제할까요?"
        );

        if (!shouldDelete) return;

        delete diaryEntries[selectedCalendarDate];
    } else {
        diaryEntries[selectedCalendarDate] = {
            text,
            mood: selectedMood,
            photos: selectedPhotos
        };
    }

    if (saveStorage("diaryEntries", diaryEntries)) {
        renderCalendar();
        loadSelectedDiary();
        alert("일기를 저장했어요 🌷");
    }
});


/* ---------- 처음 실행 ---------- */

function initializeApp() {
    updateTime();
    updateTimePeriod();

    getLocation(false);

    updateHistory();
    updateWeeklySummary();

    showRandomActivity();

    renderCalendar();
    loadSelectedDiary();

    showPage("home");

    // 1분마다 시간과 시간대 배경 갱신
    setInterval(() => {
        updateTime();
        updateTimePeriod();
    }, 60000);
}

initializeApp();

/* ---------- 첫 방문 환영 팝업 ---------- */

const welcomePopup = document.getElementById("welcomePopup");
const welcomeForm = document.getElementById("welcomeForm");
const nicknameInput = document.getElementById("nicknameInput");

if (welcomePopup && welcomeForm && nicknameInput) {
    const savedNickname = localStorage.getItem("shallWeNickname");

    if (!savedNickname) {
        welcomePopup.hidden = false;
    }

    welcomeForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const nickname = nicknameInput.value.trim();

        if (!nickname) {
            nicknameInput.focus();
            return;
        }

        localStorage.setItem("shallWeNickname", nickname);
        welcomePopup.hidden = true;
    });
}

/* ---------- 설정: 프로필과 테마 ---------- */

const settingsNicknameInput =
    document.getElementById("settingsNicknameInput");
const profilePhotoInput =
    document.getElementById("profilePhotoInput");
const profilePreview =
    document.getElementById("profilePreview");
const profilePlaceholder =
    document.getElementById("profilePlaceholder");

function loadSettings() {
    const nickname = localStorage.getItem("shallWeNickname") || "";
    const photo = localStorage.getItem("shallWeProfilePhoto");
    const theme = localStorage.getItem("shallWeTheme") || "yellow";

    if (settingsNicknameInput) {
        settingsNicknameInput.value = nickname;
    }

    if (photo && profilePreview) {
        profilePreview.src = photo;
        profilePreview.hidden = false;

        if (profilePlaceholder) {
            profilePlaceholder.hidden = true;
        }
    } else {
        if (profilePreview) {
            profilePreview.hidden = true;
            profilePreview.removeAttribute("src");
        }

        if (profilePlaceholder) {
            profilePlaceholder.hidden = false;
        }
    }



    document.body.dataset.theme = theme;

    document.querySelectorAll(".theme-button").forEach((button) => {
        button.classList.toggle(
            "selected",
            button.dataset.themeChoice === theme
        );
    });
}


const saveProfileButton = document.getElementById("saveProfileButton");

if (saveProfileButton) {
    saveProfileButton.addEventListener("click", () => {
        const nickname = settingsNicknameInput.value.trim();

        if (!nickname) {
            alert("닉네임을 입력해 주세요.");
            settingsNicknameInput.focus();
            return;
        }

        localStorage.setItem("shallWeNickname", nickname);
        alert("프로필을 저장했어요!");
    });
}

if (profilePhotoInput) {
    profilePhotoInput.addEventListener("change", () => {
        const file = profilePhotoInput.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("이미지 파일을 선택해 주세요.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const photo = reader.result;

            try {
                localStorage.setItem("shallWeProfilePhoto", photo);
                profilePreview.src = photo;
                profilePreview.hidden = false;
                profilePlaceholder.hidden = true;
            } catch (error) {
                alert("사진 용량이 커서 저장하지 못했어요. 더 작은 사진을 선택해 주세요.");
            }
        };

        reader.readAsDataURL(file);
    });
}

document.querySelectorAll(".theme-button").forEach((button) => {
    button.addEventListener("click", () => {
        const theme = button.dataset.themeChoice;

        localStorage.setItem("shallWeTheme", theme);
        document.body.dataset.theme = theme;

        document.querySelectorAll(".theme-button").forEach((item) => {
            item.classList.toggle("selected", item === button);
        });
    });
});

const settingsButton = document.getElementById("settingsButton");

if (settingsButton) {
    settingsButton.addEventListener("click", () => {
        loadSettings();
        showPage("settings");
    });
}


loadSettings();


/* 주사위와 설정 버튼 클릭 애니메이션 */
function tiltIcon(button) {
    if (!button) return;

    button.classList.remove("animate-icon");
    void button.offsetWidth;
    button.classList.add("animate-icon");
}

const diceButton = document.getElementById("randomButton");
const gearButton = document.getElementById("settingsButton");

if (diceButton) {
    diceButton.addEventListener("click", () => tiltIcon(diceButton));
}

if (gearButton) {
    gearButton.addEventListener("click", () => tiltIcon(gearButton));
}
