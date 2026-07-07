// BGM Audio Object
let bgmAudio = new Audio();
bgmAudio.loop = true;

// TTS Utterance reference to prevent Garbage Collection
window.activeUtterances = [];
let currentUtterance = null;

// Three.js Global Variables for 3D Coaching Mannequin
let threeScene = null;
let threeCamera = null;
let threeRenderer = null;
let threeMannequin = null;
let threeControls = null;
let threeCanvas = null;
let isThreeInitialized = false;

// GM Therapist Image Resources (Pretty female physical therapist Minji)
const KODARI_IMAGES = {
    salute: "stitch_assets/images/female_therapist_salute.png",
    success: "stitch_assets/images/female_therapist_success.png",
    excited: "stitch_assets/images/female_therapist_excited.png",
    panic: "stitch_assets/images/female_therapist_panic.png",
    crying: "stitch_assets/images/female_therapist_crying.png"
};

// Motion Capture Pose Connections (Skeleton Map)
const POSE_CONNECTIONS = [
    ['nose', 'left_eye'], ['nose', 'right_eye'],
    ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
];

// App State Management
let appState = {
    onboardingCompleted: false,
    dailyCompletedCount: 4,
    dailyTargetCount: 6,
    totalCompletedCount: 24,
    activeTab: 'dashboard',
    exercise: {
        isPlaying: false,
        currentTime: 0,
        totalTime: 40,
        activeStep: 0,
        stepDurations: [6, 6, 6, 6, 8, 8],
        stepAccumulatedTimes: [0, 6, 12, 18, 24, 32, 40],
        stepTitles: [
            "준비 단계 (6초)", 
            "1단계: 거북목 정렬 인지 (6초)", 
            "2단계: 허리 세우고 등 펴기 (6초)", 
            "3단계: 가슴 열고 준비 (6초)", 
            "4단계: 날개뼈 수축 모으기 (8초)",
            "5단계: 고개 뒤로 젖히기 (8초)"
        ],
        stepDescs: [
            "의자에 앉아 정면을 바라보며 현재 나의 목 정렬 상태를 체크합니다.",
            "목이 앞으로 심하게 빠지면 디스크에 과부하가 생겨 찢어질 수 있으니 주의합니다.",
            "구부정한 등이 펴지도록 가슴을 열고 척추와 허리를 곧게 세웁니다.",
            "양 팔꿈치를 굽혀 어깨선과 정렬하고, 가슴 근육을 확장할 준비를 합니다.",
            "등 뒤 날개뼈(견갑골)가 서로 닿는 느낌으로 팔을 뒤로 당겨 꽉 모아줍니다.",
            "날개뼈를 모은 상태를 단단히 유지하면서, 고개를 천천히 뒤로 젖혀 유지합니다."
        ],
        stepTips: [
            "어깨의 긴장을 풀고 정면을 자연스럽게 바라봅니다.",
            "턱을 당기는 힘보다는 머리가 앞으로 과도하게 쏠리지 않게 하는 데 집중합니다.",
            "엉덩이를 등받이 끝까지 밀어 넣어 척추의 C자 아치를 유지합니다.",
            "가슴을 활짝 펴며 굽은 어깨(라운드 숄더)를 개방합니다.",
            "날개뼈 사이에 연필을 하나 끼우고 이를 꽉 잡고 있다고 생각하며 수축합니다.",
            "목에 통증이 없는 범위까지만 고개를 젖히며, 어지러움이 생기면 즉시 중단합니다."
        ],
        audioMuted: false,
        bgmSelected: 'off',
        bgmVolume: 0.4,
        timerInterval: null,
        animationFrameId: null,
        viewMode: 'illustration' // 'illustration' or '3d'
    },
    analysis: {
        cameraStream: null,
        isScanning: false,
        scanInterval: null,
        detector: null,
        mode: 'ai', // 'ai' or 'manual'
        coords: {
            earX: 240,
            earY: 140,
            shoulderX: 340,
            shoulderY: 230,
            activeDrag: null // 'ear', 'shoulder', or null
        },
        keypoints: [],
        shoulderAsymmetric: false
    },
    alarm: {
        enabled: false,
        intervalMinutes: 60,
        nextAlarmTime: null,
        checkTimer: null
    },
    pet: {
        name: "민지"
    }
};

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    // Check onboarding status
    const storedOnboarding = localStorage.getItem('neckcare_onboarding');
    if (storedOnboarding === 'completed') {
        appState.onboardingCompleted = true;
        document.getElementById('onboarding-screen').classList.add('hidden');
    }
    
    // Load daily stats
    const storedCompleted = localStorage.getItem('neckcare_completed_today');
    if (storedCompleted !== null) {
        appState.dailyCompletedCount = parseInt(storedCompleted);
    }
    
    // Set onboarding event
    document.getElementById('start-app-btn').addEventListener('click', completeOnboarding);
    
    // Sync initial UI
    updateProgressUI();
    
    // Initialize interactive manual canvas events
    initInteractiveCanvas();
    
    // Seed dummy history if empty
    seedDummyHistory();
    
    // Recalculate stats based on local DB
    recalculateDashboardStats();
    
    // Initialize Stretching Alarm System
    initAlarmSystem();
    
    // Check and apply dark mode preference at startup
    const darkModeEnabled = localStorage.getItem('neckcare_dark_mode') === 'true';
    if (darkModeEnabled) {
        document.documentElement.classList.add('dark');
        const icon = document.getElementById('dark-mode-icon');
        if (icon) icon.innerText = "light_mode";
    }
    
    // Auto-synthesize dummy voices to unlock audio context on mobile/safari
    window.speechSynthesis.getVoices();
    
    // Initialize BGM setting from local storage
    const storedBgm = localStorage.getItem('neckcare_selected_bgm') || 'off';
    selectBgm(storedBgm);
});

// Complete Onboarding
function completeOnboarding() {
    appState.onboardingCompleted = true;
    localStorage.setItem('neckcare_onboarding', 'completed');
    
    // Fade out onboarding screen
    const screen = document.getElementById('onboarding-screen');
    screen.style.transition = 'opacity 0.5s ease-out';
    screen.style.opacity = '0';
    setTimeout(() => {
        screen.classList.add('hidden');
        switchTab('dashboard');
    }, 500);
    
    // Voice welcome
    speakVoice("반갑습니다. 바른 자세 목 허리 케어 코치 넥 케어를 시작합니다.");
}

// Switch Tabs
function switchTab(tabId) {
    // Stop exercise player if leaving exercise tab
    if (appState.activeTab === 'exercise' && tabId !== 'exercise') {
        pauseExercisePlayer();
    }
    // Stop camera if leaving analysis tab
    if (appState.activeTab === 'analysis' && tabId !== 'analysis') {
        stopCamera();
    }

    appState.activeTab = tabId;
    
    // Toggle active screen content
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
    });
    
    const activeEl = document.getElementById(`tab-${tabId}`);
    if (activeEl) {
        activeEl.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Update navigation styles
    const navButtons = {
        'dashboard': 'nav-dashboard',
        'exercise': 'nav-exercise',
        'analysis': 'nav-analysis',
        'profile': 'nav-profile'
    };
    
    Object.keys(navButtons).forEach(key => {
        const btn = document.getElementById(navButtons[key]);
        if (!btn) return;
        
        const icon = btn.querySelector('.material-symbols-outlined');
        if (key === tabId) {
            btn.className = "flex flex-col items-center justify-center text-primary px-4 py-1 transition-colors duration-200";
            if (icon) icon.style.fontVariationSettings = "'FILL' 1";
        } else {
            btn.className = "flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:text-primary transition-colors duration-200";
            if (icon) icon.style.fontVariationSettings = "'FILL' 0";
        }
    });

    // Custom updates for specific tabs
    if (tabId === 'profile') {
        renderHistoryLog();
        updateProfileChart();
    } else if (tabId === 'exercise') {
        setTimeout(() => {
            initThreePlayer();
            if (threeRenderer && threeScene && threeCamera) {
                threeRenderer.render(threeScene, threeCamera);
            }
        }, 100);
    }
}

// Update Dashboard Progress UI
function updateProgressUI() {
    const percent = Math.round((appState.dailyCompletedCount / appState.dailyTargetCount) * 100);
    
    // Update dashboard text
    document.getElementById('dashboard-progress-percent').innerText = `${percent}%`;
    document.getElementById('dashboard-progress-bar').style.width = `${percent}%`;
    document.getElementById('dashboard-completed-count').innerText = `${appState.dailyCompletedCount}회`;
    
    // Update profile cumulative count
    document.getElementById('profile-total-count').innerText = `${appState.totalCompletedCount}회`;
    
    // Sync localStorage
    localStorage.setItem('neckcare_completed_today', appState.dailyCompletedCount);
}

// ==========================================
// INTERACTIVE EXERCISE PLAYER LOGIC (VIDEO-LIKE)
// ==========================================

const EXERCISE_ROUTINES = [
    {
        id: "mckenzie",
        name: "거북목 교정 멕켄지 운동",
        intensity: "상",
        totalTime: 40,
        stepDurations: [6, 6, 6, 6, 8, 8],
        stepAccumulatedTimes: [0, 6, 12, 18, 24, 32, 40],
        stepTitles: [
            "준비 단계 (6초)", 
            "1단계: 거북목 정렬 인지 (6초)", 
            "2단계: 허리 세우고 등 펴기 (6초)", 
            "3단계: 가슴 열고 준비 (6초)", 
            "4단계: 날개뼈 수축 모으기 (8초)",
            "5단계: 고개 뒤로 젖히기 (8초)"
        ],
        stepDescs: [
            "의자에 앉아 정면을 바라보며 현재 나의 목 정렬 상태를 체크합니다.",
            "목이 앞으로 심하게 빠지면 디스크에 과부하가 생겨 찢어질 수 있으니 주의합니다.",
            "구부정한 등이 펴지도록 가슴을 열고 척추와 허리를 곧게 세웁니다.",
            "양 팔꿈치를 굽혀 어깨선과 정렬하고, 가슴 근육을 확장할 준비를 합니다.",
            "등 뒤 날개뼈(견갑골)가 서로 닿는 느낌으로 팔을 뒤로 당겨 꽉 모아줍니다.",
            "날개뼈를 모은 상태를 단단히 유지하면서, 고개를 천천히 뒤로 젖혀 유지합니다."
        ],
        stepTips: [
            "어깨의 긴장을 풀고 정면을 자연스럽게 바라봅니다.",
            "턱을 당기는 힘보다는 머리가 앞으로 과도하게 쏠리지 않게 하는 데 집중합니다.",
            "엉덩이를 등받이 끝까지 밀어 넣어 척추의 C자 아치를 유지합니다.",
            "가슴을 활짝 펴며 굽은 어깨(라운드 숄더)를 개방합니다.",
            "날개뼈 사이에 연필을 하나 끼우고 이를 꽉 잡고 있다고 생각하며 수축합니다.",
            "목에 통증이 없는 범위까지만 고개를 젖히며, 어지러움이 생기면 즉시 중단합니다."
        ],
        stepSpeech: [
            "준비 단계. 가슴을 펴고 바르게 앉아 준비합니다.",
            "주의. 목이 앞으로 빠지면 디스크가 눌리면서 찢어집니다.",
            "일 단계. 엉덩이를 깊숙이 앉고 구부정한 등을 펴 줍니다.",
            "이 단계. 양 팔을 굽히고 가슴을 활짝 펴 줍니다.",
            "삼 단계. 양 날개뼈를 등 뒤로 꽉 모아 조여 줍니다.",
            "사 단계. 통증이 생기기 전까지만 고개를 천천히 뒤로 젖힙니다."
        ],
        stepImages: [
            "stitch_assets/images/mckenzie_3d_1.png",
            "stitch_assets/images/mckenzie_3d_2.png",
            "stitch_assets/images/mckenzie_3d_3.png",
            "stitch_assets/images/mckenzie_3d_4.png",
            "stitch_assets/images/mckenzie_3d_5.png",
            "stitch_assets/images/mckenzie_3d_6.png"
        ]
    },
    {
        id: "shoulder_squeeze",
        name: "견갑골 후인-하강",
        intensity: "중",
        totalTime: 28,
        stepDurations: [6, 8, 8, 6],
        stepAccumulatedTimes: [0, 6, 14, 22, 28],
        stepTitles: [
            "준비 단계 (6초)",
            "1단계: 견갑골 조이기 (8초)",
            "2단계: 어깨 끌어내리기 (8초)",
            "3단계: 힘 빼고 원위치 (6초)"
        ],
        stepDescs: [
            "양손을 무릎에 올리고 가슴을 활짝 펴고 앉습니다.",
            "양 날개뼈를 척추 방향으로 강하게 등 뒤로 모아줍니다.",
            "날개뼈를 모은 상태를 유지하면서 귀와 어깨가 멀어지도록 아래쪽으로 지긋이 끌어내립니다.",
            "등 근육의 긴장을 풀며 숨을 후 뱉고 준비 자세로 돌아옵니다."
        ],
        stepTips: [
            "어깨가 위로 으쓱 솟지 않도록 주의합니다.",
            "등 뒤 날개뼈 아랫부분에 뻐근한 자극이 느껴져야 합니다.",
            "목이 앞으로 빠지지 않게 곧게 세우는 힘을 유지하세요.",
            "가벼운 흔들림과 함께 뭉쳐있던 피로가 풀리는 것을 느껴보세요."
        ],
        stepSpeech: [
            "준비 단계. 가슴을 펴고 바르게 앉아 척추를 세워 줍니다.",
            "일 단계. 양 날개뼈를 등 뒤로 단단히 모아 조여줍니다.",
            "이 단계. 모은 날개뼈를 아래로 쓸어내려 어깨를 낮춥니다.",
            "삼 단계. 힘을 서서히 풀며 처음 자세로 돌아갑니다."
        ],
        stepImages: [
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png",
            "stitch_assets/images/10_shoulder_blade_squeeze_86c016391d8a4bf296808feda4932fe3.png",
            "stitch_assets/images/10_shoulder_blade_squeeze_86c016391d8a4bf296808feda4932fe3.png",
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png"
        ]
    },
    {
        id: "side_stretch",
        name: "사무실 넥 사이드 릴렉스",
        intensity: "하",
        totalTime: 32,
        stepDurations: [6, 10, 10, 6],
        stepAccumulatedTimes: [0, 6, 16, 26, 32],
        stepTitles: [
            "준비 단계 (6초)",
            "1단계: 좌측 사선 스트레칭 (10초)",
            "2단계: 우측 사선 스트레칭 (10초)",
            "3단계: 중앙 정면 복귀 (6초)"
        ],
        stepDescs: [
            "허리를 펴고 앉아 양손을 허벅지 위에 가지런히 얹습니다.",
            "오른손을 머리 뒤로 넘겨 왼쪽 귀 위를 짚고, 45도 앞쪽 대각선 방향으로 지긋이 당겨줍니다.",
            "손을 바꾸어 왼손으로 오른쪽 머리를 짚고, 반대편 45도 앞쪽 사선으로 당겨줍니다.",
            "손을 풀고 정면을 보며 호흡을 가다듬습니다."
        ],
        stepTips: [
            "어깨가 따라 올라가지 않도록 반대편 어깨를 지긋이 눌러주세요.",
            "목 뒤 외측 승모근과 견갑거근이 늘어나는 것을 느낍니다.",
            "과도한 통증이 생기지 않도록 지그시 부드럽게 당겨주세요.",
            "목 옆선과 등 뒤쪽 라인의 팽팽함이 서서히 풀립니다."
        ],
        stepSpeech: [
            "준비 단계. 목의 긴장을 풀고 정면을 바라봅니다.",
            "일 단계. 오른손으로 머리를 감싸고 오른쪽 아래로 지그시 당겨줍니다.",
            "이 단계. 왼손으로 머리를 감싸고 왼쪽 아래로 지그시 당겨줍니다.",
            "삼 단계. 손을 떼고 정면으로 돌아옵니다."
        ],
        stepImages: [
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png",
            "stitch_assets/images/11_neck_side_stretch_6a26e5d3e8b54e13b3fe148a1e42c797.png",
            "stitch_assets/images/11_neck_side_stretch_6a26e5d3e8b54e13b3fe148a1e42c797.png",
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png"
        ]
    },
    {
        id: "doorway_chest",
        name: "문틀 흉근 개방",
        intensity: "중",
        totalTime: 30,
        stepDurations: [6, 12, 6, 6],
        stepAccumulatedTimes: [0, 6, 18, 24, 30],
        stepTitles: [
            "준비 단계 (6초)",
            "1단계: 가슴 활짝 열기 (12초)",
            "2단계: 등 뒤 날개뼈 모으기 (6초)",
            "3단계: 제자리로 복귀 (6초)"
        ],
        stepDescs: [
            "문틀이나 벽 모퉁이에 양 팔꿈치를 90도로 굽혀 댑니다.",
            "한쪽 발을 앞으로 디디며 체중을 서서히 앞으로 실어 가슴 앞쪽 근육을 스트레칭합니다.",
            "이 상태에서 가슴을 더 넓게 펴며 날개뼈를 등 뒤로 모아줍니다.",
            "디뎠던 발을 떼고 처음 서 있던 위치로 돌아옵니다."
        ],
        stepTips: [
            "허리가 과도하게 꺾이지 않도록 복부에 약간의 힘을 줍니다.",
            "굽은 어깨와 말린 가슴이 시원하게 열리는 자극을 느껴봅니다.",
            "호흡은 멈추지 말고 지긋이 들이마시고 내뱉으세요.",
            "어깨 앞쪽과 가슴 상부가 유연해지는 느낌을 가져보세요."
        ],
        stepSpeech: [
            "준비 단계. 양 팔꿈치를 굽혀 문틀이나 벽에 대어 줍니다.",
            "일 단계. 발을 앞으로 디디며 상체를 밀어 가슴을 펴 줍니다.",
            "이 단계. 날개뼈를 조여 굽은 등을 활짝 펴 줍니다.",
            "삼 단계. 발을 떼고 원래 위치로 돌아옵니다."
        ],
        stepImages: [
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png",
            "stitch_assets/images/12_doorway_chest_stretch_ea9b955651ec4f80a0771a0bf132da9a.png",
            "stitch_assets/images/10_shoulder_blade_squeeze_86c016391d8a4bf296808feda4932fe3.png",
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png"
        ]
    },
    {
        id: "standing_chin",
        name: "스탠딩 턱 코칭",
        intensity: "하",
        totalTime: 24,
        stepDurations: [6, 6, 6, 6],
        stepAccumulatedTimes: [0, 6, 12, 18, 24],
        stepTitles: [
            "준비 단계 (6초)",
            "1단계: 손가락으로 턱 밀어넣기 (6초)",
            "2단계: 뒤통수 세우기 (6초)",
            "3단계: 긴장 풀기 (6초)"
        ],
        stepDescs: [
            "벽에 등과 뒤통수를 밀착하고 바르게 섭니다.",
            "두 손가락을 턱 끝에 대고, 턱을 뒤쪽 방향으로 가볍게 수평으로 밀어 넣어줍니다.",
            "턱을 넣은 상태에서 정수리를 천장 방향으로 곧게 뽑아 올린다는 느낌을 유지합니다.",
            "턱을 대던 손을 내리고 자연스럽게 호흡하며 머리의 바른 정렬 상태를 기억합니다."
        ],
        stepTips: [
            "시선이 아래로 떨어지지 않도록 정면을 멀리 응시해야 합니다.",
            "목 뒤쪽 근육(판상근 및 반가시근)이 팽팽히 펴지는 것을 느낍니다.",
            "뒷목이 길어지는 느낌에 집중해 보세요.",
            "가벼운 자세 교정 효과가 즉각 나타날 것입니다."
        ],
        stepSpeech: [
            "준비 단계. 등과 뒤통수를 세우고 바르게 섭니다.",
            "일 단계. 손가락을 턱에 대고 뒤로 가볍게 밀어 넣습니다.",
            "이 단계. 정수리를 위로 밀어 올려 목 뒤를 늘려 줍니다.",
            "삼 단계. 손을 떼고 편안하게 긴장을 풀어줍니다."
        ],
        stepImages: [
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png",
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png",
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png",
            "stitch_assets/images/09_mckenzie_standing_eeea8a2761e44a108b9ce7668606b973.png"
        ]
    }
];

function loadExerciseRoutine(routineId) {
    const routine = EXERCISE_ROUTINES.find(r => r.id === routineId);
    if (!routine) return;
    
    appState.exercise.currentRoutineId = routineId;
    appState.exercise.totalTime = routine.totalTime;
    appState.exercise.stepDurations = [...routine.stepDurations];
    appState.exercise.stepAccumulatedTimes = [...routine.stepAccumulatedTimes];
    appState.exercise.stepTitles = [...routine.stepTitles];
    appState.exercise.stepDescs = [...routine.stepDescs];
    appState.exercise.stepTips = [...routine.stepTips];
    appState.exercise.stepSpeech = [...routine.stepSpeech];
    appState.exercise.stepImages = [...routine.stepImages];
    
    // Initialize 3D Player Canvas and reset model pose
    setTimeout(() => {
        initThreePlayer();
        if (threeRenderer && threeScene && threeCamera) {
            animateThreeMannequin();
            threeRenderer.render(threeScene, threeCamera);
        }
    }, 100);
    
    // Rebuild steps grid
    const stepsGrid = document.getElementById('player-steps-grid');
    if (stepsGrid) {
        stepsGrid.className = `grid grid-cols-1 md:grid-cols-${routine.stepDurations.length} gap-3`;
        stepsGrid.innerHTML = routine.stepDurations.map((dur, idx) => {
            const stepNum = idx + 1;
            const badgeClass = idx === 0 ? "bg-primary text-on-primary" : "bg-outline-variant text-on-surface";
            const borderClass = idx === 0 ? "border-2 border-primary bg-primary/5" : "border border-outline-variant/60";
            const titleClass = idx === 0 ? "text-primary" : "text-on-surface";
            
            const cleanTitle = routine.stepTitles[idx].split(":")[1] || routine.stepTitles[idx].split("(")[0];
            const displayTitle = cleanTitle.trim();
            const tagText = routine.stepTitles[idx].split(":")[0].trim();
            
            return `
                <div onclick="jumpToStep(${idx})" class="${borderClass} rounded-xl p-3.5 cursor-pointer hover:bg-primary/5 transition-colors text-left relative" id="grid-step-${idx}">
                    <span class="absolute top-3 right-3 text-[10px] ${badgeClass} px-1.5 py-0.5 rounded font-bold">${stepNum}</span>
                    <h4 class="text-xs font-bold ${titleClass} mb-1">${tagText}</h4>
                    <p class="text-[11px] text-on-surface-variant leading-tight">${displayTitle}</p>
                </div>
            `;
        }).join('');
    }
    
    // Set video total time labels
    const totalMins = String(Math.floor(routine.totalTime / 60)).padStart(2, '0');
    const totalSecs = String(routine.totalTime % 60).padStart(2, '0');
    const totalLabel = document.getElementById('player-time-total');
    if (totalLabel) totalLabel.innerText = `${totalMins}:${totalSecs}`;
    
    // Set titles
    document.getElementById('player-step-title').innerText = routine.stepTitles[0];
    document.getElementById('player-step-desc').innerText = routine.stepDescs[0];
    document.getElementById('player-step-tip').innerText = routine.stepTips[0];
    document.getElementById('player-status-tag').innerText = routine.stepTitles[0].split(":")[0];
    
    // Update player header title
    const playerHeaderTitle = document.querySelector('#tab-exercise h2');
    const playerHeaderDesc = document.querySelector('#tab-exercise p');
    if (playerHeaderTitle) playerHeaderTitle.innerText = `${routine.name} 플레이어`;
    if (playerHeaderDesc) playerHeaderDesc.innerText = `가이드 지침과 알맞은 템포에 맞춰 안전하게 스트레칭 하세요.`;
    
    restartPlayer();
}

function startExercisePlayer(routineId = 'mckenzie') {
    switchTab('exercise');
    loadExerciseRoutine(routineId);
    togglePlay(); // Auto-start
}

function togglePlay() {
    const playBtn = document.getElementById('player-play-btn');
    const playIcon = playBtn.querySelector('.material-symbols-outlined');
    
    if (appState.exercise.isPlaying) {
        pauseExercisePlayer();
    } else {
        appState.exercise.isPlaying = true;
        if (playIcon) playIcon.innerText = "pause";
        
        if (appState.exercise.bgmSelected && appState.exercise.bgmSelected !== 'off') {
            bgmAudio.play().catch(err => console.log("BGM play failed:", err));
        }
        
        speakStepVoice(appState.exercise.activeStep);
        
        appState.exercise.timerInterval = setInterval(() => {
            tickPlayer(0.1);
        }, 100);
        
        if (appState.exercise.viewMode === '3d') {
            startThreeAnimation();
        }
    }
}

function pauseExercisePlayer() {
    appState.exercise.isPlaying = false;
    const playBtn = document.getElementById('player-play-btn');
    const playIcon = playBtn.querySelector('.material-symbols-outlined');
    if (playIcon) playIcon.innerText = "play_arrow";
    
    clearInterval(appState.exercise.timerInterval);
    cancelAnimationFrame(appState.exercise.animationFrameId);
    
    bgmAudio.pause();
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    // Re-render single frame in paused state to reflect manual rotation
    if (appState.exercise.viewMode === '3d' && threeRenderer && threeScene && threeCamera) {
        animateThreeMannequin();
        threeRenderer.render(threeScene, threeCamera);
    }
}

function tickPlayer(deltaSeconds) {
    appState.exercise.currentTime += deltaSeconds;
    
    if (appState.exercise.currentTime >= appState.exercise.totalTime) {
        appState.exercise.currentTime = appState.exercise.totalTime;
        pauseExercisePlayer();
        showCompletionOverlay();
        return;
    }
    
    const progressPercent = (appState.exercise.currentTime / appState.exercise.totalTime) * 100;
    document.getElementById('player-progress-bar').style.width = `${progressPercent}%`;
    
    const totalSecs = Math.floor(appState.exercise.currentTime);
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    document.getElementById('player-time-current').innerText = `${mins}:${secs}`;
    
    let newStep = 0;
    const accTimes = appState.exercise.stepAccumulatedTimes;
    for (let i = 0; i < accTimes.length - 1; i++) {
        if (appState.exercise.currentTime >= accTimes[i] && appState.exercise.currentTime < accTimes[i+1]) {
            newStep = i;
            break;
        }
    }
    
    if (newStep !== appState.exercise.activeStep) {
        changeStep(newStep);
    }
    
    // Update Big Step Countdown Center Text
    const stepTimeRemaining = Math.ceil(accTimes[appState.exercise.activeStep + 1] - appState.exercise.currentTime);
    const bigTimer = document.getElementById('player-big-timer');
    if (bigTimer) {
        bigTimer.innerText = stepTimeRemaining;
        bigTimer.style.opacity = "0.7";
        bigTimer.style.transform = "scale(1)";
        setTimeout(() => {
            if (bigTimer) bigTimer.style.transform = "scale(0.85)";
        }, 100);
    }
}

function changeStep(stepIndex) {
    appState.exercise.activeStep = stepIndex;
    
    // Update details and texts
    document.getElementById('player-status-tag').innerText = appState.exercise.stepTitles[stepIndex].split(":")[0];
    document.getElementById('player-step-title').innerText = appState.exercise.stepTitles[stepIndex];
    document.getElementById('player-step-desc').innerText = appState.exercise.stepDescs[stepIndex];
    document.getElementById('player-step-tip').innerText = appState.exercise.stepTips[stepIndex];
    
    // Update Golden Goose exercise companion speech bubble
    updatePlayerPetSpeech(stepIndex);
    
    // Change step icon based on step
    const iconMap = ["info", "fitness_center", "check_circle", "expand_less", "replay", "replay"];
    document.getElementById('player-step-icon').innerText = iconMap[stepIndex] || "info";
    
    // Update visual highlighted step card on step grid
    const totalStepsCount = appState.exercise.stepDurations ? appState.exercise.stepDurations.length : 5;
    for (let i = 0; i < totalStepsCount; i++) {
        const gridCard = document.getElementById(`grid-step-${i}`);
        if (!gridCard) continue;
        
        const badge = gridCard.querySelector('span');
        const titleText = gridCard.querySelector('h4');
        
        if (i === stepIndex) {
            gridCard.className = "border-2 border-primary bg-primary/5 rounded-xl p-3.5 cursor-pointer hover:bg-primary/10 transition-colors text-left relative";
            if (badge) badge.className = "absolute top-3 right-3 text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded font-bold";
            if (titleText) titleText.className = "text-xs font-bold text-primary mb-1";
        } else {
            gridCard.className = "border border-outline-variant/60 rounded-xl p-3.5 cursor-pointer hover:bg-primary/5 transition-colors text-left relative";
            if (badge) badge.className = "absolute top-3 right-3 text-[10px] bg-outline-variant text-on-surface px-1.5 py-0.5 rounded font-bold";
            if (titleText) titleText.className = "text-xs font-bold text-on-surface mb-1";
        }
    }
    
    // Update step image
    const stepImg = document.getElementById('player-step-img');
    if (stepImg && appState.exercise.stepImages && appState.exercise.stepImages[stepIndex]) {
        stepImg.src = appState.exercise.stepImages[stepIndex];
    }
    
    // Speak audio instructions
    speakStepVoice(stepIndex);
    
    // Trigger Three.js render update
    if (appState.exercise.viewMode === '3d' && threeRenderer && threeScene && threeCamera) {
        animateThreeMannequin();
        threeRenderer.render(threeScene, threeCamera);
    }
    
    if (appState.exercise.viewMode === '3d') {
        startThreeAnimation();
    }
}

function startThreeAnimation() {
    cancelAnimationFrame(appState.exercise.animationFrameId);
    
    function animate() {
        if (!appState.exercise.isPlaying) return;
        
        if (threeControls) threeControls.update();
        animateThreeMannequin();
        
        if (threeRenderer && threeScene && threeCamera) {
            threeRenderer.render(threeScene, threeCamera);
        }
        
        appState.exercise.animationFrameId = requestAnimationFrame(animate);
    }
    
    appState.exercise.animationFrameId = requestAnimationFrame(animate);
}

function jumpToStep(stepIndex) {
    pauseExercisePlayer();
    appState.exercise.currentTime = appState.exercise.stepAccumulatedTimes[stepIndex];
    changeStep(stepIndex);
    
    // Update progress bar
    const progressPercent = (appState.exercise.currentTime / appState.exercise.totalTime) * 100;
    document.getElementById('player-progress-bar').style.width = `${progressPercent}%`;
    
    // Update timer labels
    const totalSecs = Math.floor(appState.exercise.currentTime);
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    document.getElementById('player-time-current').innerText = `${mins}:${secs}`;
    
    togglePlay();
}

function prevStep() {
    const currentStep = appState.exercise.activeStep;
    if (currentStep > 0) {
        jumpToStep(currentStep - 1);
    } else {
        jumpToStep(0);
    }
}

function nextStep() {
    const currentStep = appState.exercise.activeStep;
    if (currentStep < 4) {
        jumpToStep(currentStep + 1);
    }
}

function scrubTimeline(event) {
    const scrubber = event.currentTarget;
    const rect = scrubber.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    
    pauseExercisePlayer();
    appState.exercise.currentTime = ratio * appState.exercise.totalTime;
    
    // Find active step
    let newStep = 0;
    const accTimes = appState.exercise.stepAccumulatedTimes;
    for (let i = 0; i < accTimes.length - 1; i++) {
        if (appState.exercise.currentTime >= accTimes[i] && appState.exercise.currentTime < accTimes[i+1]) {
            newStep = i;
            break;
        }
    }
    
    changeStep(newStep);
    
    // Update slider UI
    document.getElementById('player-progress-bar').style.width = `${ratio * 100}%`;
    const totalSecs = Math.floor(appState.exercise.currentTime);
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    document.getElementById('player-time-current').innerText = `${mins}:${secs}`;
    
    togglePlay();
}

function restartPlayer() {
    pauseExercisePlayer();
    appState.exercise.currentTime = 0;
    
    // Hide completion overlay
    const completeOverlay = document.getElementById('player-complete-overlay');
    completeOverlay.style.opacity = "0";
    completeOverlay.style.pointerEvents = "none";
    
    // Show controls overlay
    const controls = document.getElementById('player-controls-overlay');
    if (controls) controls.classList.remove('hidden');
    
    // Show big timer
    const bigTimer = document.getElementById('player-big-timer');
    if (bigTimer) bigTimer.style.opacity = "0";
    
    appState.exercise.viewMode = 'illustration';
    updatePlayerViewModeUI();
    changeStep(0);
}

function showCompletionOverlay() {
    const completeOverlay = document.getElementById('player-complete-overlay');
    completeOverlay.style.opacity = "1";
    completeOverlay.style.pointerEvents = "auto";
    
    // Hide controls overlay
    const controls = document.getElementById('player-controls-overlay');
    if (controls) controls.classList.add('hidden');
    
    const routine = EXERCISE_ROUTINES.find(r => r.id === appState.exercise.currentRoutineId);
    const routineName = routine ? routine.name : "코칭 운동";
    
    const completeTitle = completeOverlay.querySelector('h3');
    if (completeTitle) completeTitle.innerText = `${routineName} 완료!`;
    
    // Update Pet state in completion overlay
    const completePetImg = document.getElementById('player-complete-pet-image');
    const completePetText = document.getElementById('player-complete-pet-text');
    
    let stage = 1;
    let growthTitle = "초보 자세 메이트 민지 🫡";
    let imgUrl = KODARI_IMAGES.salute;
    
    if (appState.totalCompletedCount === 0 || appState.totalCompletedCount === 1) {
        stage = 1; growthTitle = "초보 자세 메이트 민지 🫡"; imgUrl = KODARI_IMAGES.success;
    } else if (appState.totalCompletedCount >= 2 && appState.totalCompletedCount < 5) {
        stage = 2; growthTitle = "자세 수호 요정 민지 🔥"; imgUrl = KODARI_IMAGES.success;
    } else {
        stage = 3; growthTitle = "자세 케어 마스터 민지 🏆"; imgUrl = KODARI_IMAGES.success;
    }
    
    if (completePetImg) {
        completePetImg.src = imgUrl;
        completePetImg.style.transform = `scale(1.0)`;
    }
    if (completePetText) completePetText.innerText = growthTitle;
    
    // Check if sticker will be awarded
    const eggLayDisplay = document.getElementById('egg-lay-display');
    if (appState.totalCompletedCount >= 5) {
        if (eggLayDisplay) eggLayDisplay.classList.remove('hidden');
        speakVoice(`수고하셨습니다! 민지 코치가 칭찬 스티커를 발급했습니다. 기록을 저장해 주세요.`);
    } else {
        if (eggLayDisplay) eggLayDisplay.classList.add('hidden');
        speakVoice(`수고하셨습니다! ${routineName}이 모두 끝났습니다. 기록을 저장해 주세요.`);
    }
}

function completeExercise() {
    // Increment completed counts
    appState.dailyCompletedCount = Math.min(appState.dailyTargetCount, appState.dailyCompletedCount + 1);
    appState.totalCompletedCount += 1;
    
    // Sync to local DB
    const routine = EXERCISE_ROUTINES.find(r => r.id === appState.exercise.currentRoutineId);
    saveSessionToLocalStorage({
        type: "exercise",
        routineId: appState.exercise.currentRoutineId,
        routineName: routine ? routine.name : "코칭 운동"
    });
    
    // Update progress elements
    updateProgressUI();
    
    // Hide completion screen
    restartPlayer();
    
    // Back to dashboard
    switchTab('dashboard');
}

function toggleSound() {
    appState.exercise.audioMuted = !appState.exercise.audioMuted;
    
    const icon = document.getElementById('player-sound-icon');
    if (appState.exercise.audioMuted) {
        icon.innerText = "volume_off";
        window.speechSynthesis.cancel();
    } else {
        icon.innerText = "volume_up";
        speakStepVoice(appState.exercise.activeStep);
    }
}

function togglePlayerViewMode() {
    const currentMode = appState.exercise.viewMode || 'illustration';
    const newMode = currentMode === 'illustration' ? '3d' : 'illustration';
    appState.exercise.viewMode = newMode;
    
    updatePlayerViewModeUI();
}

function updatePlayerViewModeUI() {
    const mode = appState.exercise.viewMode || 'illustration';
    const imageContainer = document.getElementById('player-image-container');
    const frameContainer = document.getElementById('player-frame-container');
    const overlay3d = document.getElementById('player-3d-overlay');
    const toggleIcon = document.getElementById('player-view-mode-icon');
    const toggleLabel = document.getElementById('player-view-mode-label');
    
    if (mode === '3d') {
        if (imageContainer) imageContainer.classList.add('hidden');
        if (frameContainer) frameContainer.classList.remove('hidden');
        if (overlay3d) overlay3d.classList.remove('hidden');
        
        if (toggleIcon) toggleIcon.innerText = "image";
        if (toggleLabel) toggleLabel.innerText = "일러스트 보기";
        
        initThreePlayer();
        if (appState.exercise.isPlaying) {
            startThreeAnimation();
        } else {
            if (threeRenderer && threeScene && threeCamera) {
                animateThreeMannequin();
                threeRenderer.render(threeScene, threeCamera);
            }
        }
    } else {
        if (imageContainer) imageContainer.classList.remove('hidden');
        if (frameContainer) frameContainer.classList.add('hidden');
        if (overlay3d) overlay3d.classList.add('hidden');
        
        if (toggleIcon) toggleIcon.innerText = "3d_rotation";
        if (toggleLabel) toggleLabel.innerText = "3D 캐릭터 보기";
        
        cancelAnimationFrame(appState.exercise.animationFrameId);
    }
}

// Speak step instructions using TTS in Korean
function speakStepVoice(stepIndex) {
    if (appState.exercise.audioMuted) return;
    if (appState.exercise.stepSpeech && appState.exercise.stepSpeech[stepIndex]) {
        speakVoice(appState.exercise.stepSpeech[stepIndex]);
    }
}

function speakVoice(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Clear any playing speech
        
        // Use setTimeout to bypass Chrome speechSynthesis async cancel bug
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            // Keep strong reference in global array to prevent GC cutoff
            if (!window.activeUtterances) {
                window.activeUtterances = [];
            }
            window.activeUtterances.push(utterance);
            
            utterance.onend = function() {
                window.activeUtterances = window.activeUtterances.filter(u => u !== utterance);
            };
            utterance.onerror = function() {
                window.activeUtterances = window.activeUtterances.filter(u => u !== utterance);
            };
            
            const voices = window.speechSynthesis.getVoices();
            const koVoice = voices.find(voice => voice.lang.includes('ko'));
            if (koVoice) {
                utterance.voice = koVoice;
            }
            
            window.speechSynthesis.speak(utterance);
        }, 50);
    }
}

// BGM Selection & Control Panel Logic
window.toggleBgmDropdown = function() {
    const dropdown = document.getElementById('bgm-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

// Close dropdown on click outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('bgm-dropdown');
    const bgmBtn = document.getElementById('player-bgm-btn');
    if (dropdown && bgmBtn && !bgmBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

window.selectBgm = function(bgmType) {
    appState.exercise.bgmSelected = bgmType;
    const label = document.getElementById('current-bgm-label');
    const dropdown = document.getElementById('bgm-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    
    // Stop current BGM
    bgmAudio.pause();
    
    if (bgmType === 'off') {
        if (label) label.innerText = "BGM: 끄기";
    } else {
        let src = "";
        let displayName = "";
        if (bgmType === 'saemaul') {
            src = "stitch_assets/audio/saemaul.mp3";
            displayName = "새마을운동";
        } else if (bgmType === 'bird') {
            src = "stitch_assets/audio/bird_sound.mp3";
            displayName = "새소리";
        } else if (bgmType === 'rain') {
            src = "stitch_assets/audio/rain_sound.m4a";
            displayName = "빗소리";
        }
        
        bgmAudio.src = src;
        bgmAudio.volume = appState.exercise.bgmVolume;
        
        if (label) label.innerText = `BGM: ${displayName}`;
        
        // Play BGM if exercise is currently playing
        if (appState.exercise.isPlaying) {
            bgmAudio.play().catch(err => console.log("BGM play failed:", err));
        }
    }
    
    // Save preference to LocalStorage
    localStorage.setItem('neckcare_selected_bgm', bgmType);
};

// AI POSTURE DIAGNOSIS WEBCAM SCANNER LOGIC
// ==========================================

function initInteractiveCanvas() {
    const svg = document.getElementById('posture-svg');
    if (!svg) return;
    
    const getSVGCoords = (e) => {
        const rect = svg.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = ((clientX - rect.left) / rect.width) * 640;
        const y = ((clientY - rect.top) / rect.height) * 360;
        return { x, y };
    };

    const startDrag = (e) => {
        if (!appState.analysis.cameraStream && !appState.analysis.scanInterval) return;
        const { x, y } = getSVGCoords(e);
        
        const distEar = Math.hypot(x - appState.analysis.coords.earX, y - appState.analysis.coords.earY);
        const distShoulder = Math.hypot(x - appState.analysis.coords.shoulderX, y - appState.analysis.coords.shoulderY);
        
        if (distEar < 30) {
            appState.analysis.coords.activeDrag = 'ear';
            setDetectionMode('manual');
        } else if (distShoulder < 30) {
            appState.analysis.coords.activeDrag = 'shoulder';
            setDetectionMode('manual');
        }
    };

    const drag = (e) => {
        if (!appState.analysis.coords.activeDrag) return;
        if (e.cancelable) e.preventDefault();
        
        const { x, y } = getSVGCoords(e);
        const clampedX = Math.max(10, Math.min(630, x));
        const clampedY = Math.max(10, Math.min(350, y));
        
        if (appState.analysis.coords.activeDrag === 'ear') {
            appState.analysis.coords.earX = clampedX;
            appState.analysis.coords.earY = clampedY;
        } else if (appState.analysis.coords.activeDrag === 'shoulder') {
            appState.analysis.coords.shoulderX = clampedX;
            appState.analysis.coords.shoulderY = clampedY;
        }
    };

    const endDrag = () => {
        appState.analysis.coords.activeDrag = null;
    };

    svg.addEventListener('mousedown', startDrag);
    svg.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', endDrag);

    svg.addEventListener('touchstart', startDrag, { passive: false });
    svg.addEventListener('touchmove', drag, { passive: false });
    window.addEventListener('touchend', endDrag);
}

function setDetectionMode(mode) {
    appState.analysis.mode = mode;
    const aiBtn = document.getElementById('mode-ai-btn');
    const manualBtn = document.getElementById('mode-manual-btn');
    const statusText = document.getElementById('scanning-status-text');
    
    if (!aiBtn || !manualBtn) return;
    
    if (mode === 'ai') {
        aiBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary shadow-sm transition-all btn-press";
        manualBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-on-surface-variant transition-all btn-press";
        if (statusText) statusText.innerText = "실시간 AI 자세 추적 진행 중";
        speakVoice("인공지능 자동 추적 모드입니다.");
    } else {
        aiBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-on-surface-variant transition-all btn-press";
        manualBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary shadow-sm transition-all btn-press";
        if (statusText) statusText.innerText = "수동 조절 모드: 포인트를 드래그하여 맞추세요";
        speakVoice("수동 조정 모드입니다.");
    }
}

async function initPoseDetector() {
    const statusText = document.getElementById('scanning-status-text');
    if (appState.analysis.detector) return appState.analysis.detector;
    
    if (typeof poseDetection === 'undefined' || typeof tf === 'undefined') {
        return null;
    }
    
    try {
        if (statusText) statusText.innerText = "AI 자세 분석 모델 로드 중...";
        await tf.ready();
        const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        });
        appState.analysis.detector = detector;
        if (statusText) statusText.innerText = "실시간 AI 자세 추적 진행 중";
        return detector;
    } catch (e) {
        console.error("Failed to load MoveNet model:", e);
        if (statusText) statusText.innerText = "AI 연동 실패: 수동 보정 모드 사용";
        return null;
    }
}

function startCamera() {
    const video = document.getElementById('webcam-preview');
    const placeholder = document.getElementById('webcam-placeholder');
    const btn = document.getElementById('start-camera-btn');
    const captureBtn = document.getElementById('capture-posture-btn');
    const scanningAlert = document.getElementById('scanning-alert');
    const statusText = document.getElementById('scanning-status-text');
    const modeContainer = document.getElementById('detection-mode-container');
    
    if (scanningAlert) scanningAlert.style.opacity = "1";
    if (statusText) statusText.innerText = "카메라 장치 연동 중...";
    if (modeContainer) modeContainer.classList.remove('hidden');
    
    // Set default mode UI
    setDetectionMode(appState.analysis.mode);
    
    // Attempt loading detector in background
    initPoseDetector();
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360, facingMode: 'user' } })
            .then(stream => {
                appState.analysis.cameraStream = stream;
                video.srcObject = stream;
                video.classList.remove('hidden');
                placeholder.classList.add('hidden');
                
                btn.innerHTML = `<span class="material-symbols-outlined">videocam_off</span> 카메라 중지`;
                btn.className = "bg-red-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors btn-press flex items-center gap-2";
                btn.onclick = stopCamera;
                
                captureBtn.classList.remove('hidden');
                
                // Start drawing mockup/real AI skeleton coordinates
                startSkeletalDrawing(true);
            })
            .catch(err => {
                console.error("Camera access failed. Running fallback demo simulation.", err);
                if (statusText) statusText.innerText = "카메라 에러: 데모 모드로 연결됨";
                runDemoScanSimulation();
            });
    } else {
        if (statusText) statusText.innerText = "미지원 브라우저: 데모 모드로 연결됨";
        runDemoScanSimulation();
    }
}

function stopCamera() {
    const video = document.getElementById('webcam-preview');
    const placeholder = document.getElementById('webcam-placeholder');
    const btn = document.getElementById('start-camera-btn');
    const captureBtn = document.getElementById('capture-posture-btn');
    const timerLabel = document.getElementById('diagnosis-timer');
    const scanningAlert = document.getElementById('scanning-alert');
    const modeContainer = document.getElementById('detection-mode-container');
    
    if (appState.analysis.cameraStream) {
        appState.analysis.cameraStream.getTracks().forEach(track => track.stop());
        appState.analysis.cameraStream = null;
    }
    
    video.classList.add('hidden');
    video.srcObject = null;
    placeholder.classList.remove('hidden');
    
    btn.innerHTML = `<span class="material-symbols-outlined">videocam</span> 카메라 시작`;
    btn.className = "bg-primary text-on-primary px-5 py-3 rounded-xl text-sm font-semibold hover:bg-primary-container transition-colors btn-press flex items-center gap-2";
    btn.onclick = startCamera;
    
    captureBtn.classList.add('hidden');
    timerLabel.classList.add('hidden');
    if (scanningAlert) scanningAlert.style.opacity = "0";
    if (modeContainer) modeContainer.classList.add('hidden');
    
    clearInterval(appState.analysis.scanInterval);
    appState.analysis.scanInterval = null;
    document.getElementById('posture-svg').innerHTML = '';
}

function runDemoScanSimulation() {
    const btn = document.getElementById('start-camera-btn');
    const captureBtn = document.getElementById('capture-posture-btn');
    
    btn.innerHTML = `<span class="material-symbols-outlined">videocam_off</span> 시뮬레이터 중지`;
    btn.className = "bg-red-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors btn-press flex items-center gap-2";
    btn.onclick = stopCamera;
    
    captureBtn.classList.remove('hidden');
    
    startSkeletalDrawing(false);
    
    const scanBar = document.getElementById('scan-bar');
    let topPercent = 0;
    let scanDirection = 1;
    
    appState.analysis.scanInterval = setInterval(() => {
        topPercent += 2 * scanDirection;
        if (topPercent >= 100) {
            topPercent = 100;
            scanDirection = -1;
        }
        if (topPercent <= 0) {
            topPercent = 0;
            scanDirection = 1;
        }
        if (scanBar) scanBar.style.top = `${topPercent}%`;
    }, 50);
}

function detectViewOrientation(keypoints) {
    if (!keypoints || keypoints.length === 0) return false;
    const leftEar = keypoints.find(k => k.name === 'left_ear');
    const rightEar = keypoints.find(k => k.name === 'right_ear');
    const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
    const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
    
    // Front view is detected when both ears and shoulders have high confidence
    if (leftEar && rightEar && leftShoulder && rightShoulder &&
        leftEar.score > 0.35 && rightEar.score > 0.35 &&
        leftShoulder.score > 0.35 && rightShoulder.score > 0.35) {
        return true;
    }
    return false;
}

function startSkeletalDrawing(isWebcamActive) {
    const svg = document.getElementById('posture-svg');
    const video = document.getElementById('webcam-preview');
    let fluctuation = 0;
    
    // Helper function to simulate dynamic keypoints for both orientations
    const simulateDemoKeypoints = (noise) => {
        const isFrontViewDemo = Math.floor(Date.now() / 8000) % 2 === 0;
        appState.analysis.isFrontView = isFrontViewDemo;
        
        if (isFrontViewDemo) {
            const neckX = 320 + noise * 0.5;
            const neckY = 130 + noise * 0.3;
            const shoulderOffset = Math.sin(Date.now() / 1500) * 12;
            const pelvicOffset = Math.cos(Date.now() / 2000) * 8;
            
            appState.analysis.coords.earX = neckX;
            appState.analysis.coords.earY = neckY - 20;
            appState.analysis.coords.shoulderX = neckX + 60;
            appState.analysis.coords.shoulderY = neckY + 60;

            appState.analysis.keypoints = [
                { name: 'nose', x: neckX, y: neckY - 30, score: 0.9 },
                { name: 'left_eye', x: neckX - 12, y: neckY - 38, score: 0.9 },
                { name: 'right_eye', x: neckX + 12, y: neckY - 38, score: 0.9 },
                { name: 'left_ear', x: neckX - 25, y: neckY - 32, score: 0.9 },
                { name: 'right_ear', x: neckX + 25, y: neckY - 32, score: 0.9 },
                { name: 'left_shoulder', x: neckX - 70, y: neckY + 40 + shoulderOffset, score: 0.9 },
                { name: 'right_shoulder', x: neckX + 70, y: neckY + 40 - shoulderOffset, score: 0.9 },
                { name: 'left_elbow', x: neckX - 95, y: neckY + 110, score: 0.9 },
                { name: 'right_elbow', x: neckX + 95, y: neckY + 110, score: 0.9 },
                { name: 'left_wrist', x: neckX - 90, y: neckY + 170, score: 0.9 },
                { name: 'right_wrist', x: neckX + 90, y: neckY + 170, score: 0.9 },
                { name: 'left_hip', x: neckX - 45, y: neckY + 160 + pelvicOffset, score: 0.9 },
                { name: 'right_hip', x: neckX + 45, y: neckY + 160 - pelvicOffset, score: 0.9 },
                { name: 'left_knee', x: neckX - 45, y: neckY + 240, score: 0.9 },
                { name: 'right_knee', x: neckX + 45, y: neckY + 240 + pelvicOffset * 0.5, score: 0.9 },
                { name: 'left_ankle', x: neckX - 45, y: neckY + 310, score: 0.9 },
                { name: 'right_ankle', x: neckX + 45, y: neckY + 310, score: 0.9 }
            ];
        } else {
            appState.analysis.coords.earX = 240 + noise;
            appState.analysis.coords.earY = 140 + noise * 0.5;
            appState.analysis.coords.shoulderX = 340;
            appState.analysis.coords.shoulderY = 230;
            const earX = appState.analysis.coords.earX;
            const earY = appState.analysis.coords.earY;
            const shoulderX = appState.analysis.coords.shoulderX;
            const shoulderY = appState.analysis.coords.shoulderY;
            
            appState.analysis.keypoints = [
                { name: 'nose', x: earX + 25, y: earY + 10, score: 0.9 },
                { name: 'left_eye', x: earX + 15, y: earY - 5, score: 0.9 },
                { name: 'right_eye', x: earX + 15, y: earY - 5, score: 0.9 },
                { name: 'left_ear', x: earX, y: earY, score: 0.9 },
                { name: 'right_ear', x: earX, y: earY, score: 0.9 },
                { name: 'left_shoulder', x: shoulderX, y: shoulderY, score: 0.9 },
                { name: 'right_shoulder', x: shoulderX - 25, y: shoulderY + 5, score: 0.9 },
                { name: 'left_elbow', x: shoulderX - 50, y: shoulderY + 60, score: 0.9 },
                { name: 'right_elbow', x: shoulderX - 60, y: shoulderY + 65, score: 0.9 },
                { name: 'left_wrist', x: shoulderX - 35, y: shoulderY + 105, score: 0.9 },
                { name: 'right_wrist', x: shoulderX - 45, y: shoulderY + 110, score: 0.9 },
                { name: 'left_hip', x: shoulderX - 15, y: shoulderY + 120, score: 0.9 },
                { name: 'right_hip', x: shoulderX - 30, y: shoulderY + 122, score: 0.9 },
                { name: 'left_knee', x: shoulderX - 20, y: shoulderY + 220, score: 0.9 },
                { name: 'right_knee', x: shoulderX - 35, y: shoulderY + 220, score: 0.9 },
                { name: 'left_ankle', x: shoulderX - 15, y: shoulderY + 300, score: 0.9 },
                { name: 'right_ankle', x: shoulderX - 30, y: shoulderY + 300, score: 0.9 }
            ];
        }
    };
    
    const drawLoop = async () => {
        if (!appState.analysis.cameraStream && !appState.analysis.scanInterval) {
            svg.innerHTML = '';
            return;
        }
        
        fluctuation += 0.1;
        const noise = Math.sin(fluctuation) * 0.8;
        
        if (isWebcamActive && appState.analysis.mode === 'ai') {
            if (appState.analysis.detector && video && video.readyState >= 2) {
                try {
                    const poses = await appState.analysis.detector.estimatePoses(video, {
                        maxPoses: 1,
                        flipHorizontal: false
                    });
                    
                    if (poses && poses.length > 0) {
                        const keypoints = poses[0].keypoints;
                        appState.analysis.keypoints = keypoints;
                        const leftEar = keypoints.find(k => k.name === 'left_ear');
                        const rightEar = keypoints.find(k => k.name === 'right_ear');
                        const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
                        const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
                        
                        const isFrontView = detectViewOrientation(keypoints);
                        appState.analysis.isFrontView = isFrontView;
                        
                        let ear = null;
                        let shoulder = null;
                        if (isFrontView) {
                            ear = leftEar;
                            shoulder = leftShoulder;
                        } else {
                            const leftScore = (leftEar ? leftEar.score : 0) + (leftShoulder ? leftShoulder.score : 0);
                            const rightScore = (rightEar ? rightEar.score : 0) + (rightShoulder ? rightShoulder.score : 0);
                            if (leftScore > rightScore && leftScore > 0.5) {
                                ear = leftEar;
                                shoulder = leftShoulder;
                            } else if (rightScore > 0.5) {
                                ear = rightEar;
                                shoulder = rightShoulder;
                            }
                        }
                        
                        if (ear && shoulder) {
                            const alpha = 0.3;
                            appState.analysis.coords.earX = appState.analysis.coords.earX * (1 - alpha) + ear.x * alpha;
                            appState.analysis.coords.earY = appState.analysis.coords.earY * (1 - alpha) + ear.y * alpha;
                            appState.analysis.coords.shoulderX = appState.analysis.coords.shoulderX * (1 - alpha) + shoulder.x * alpha;
                            appState.analysis.coords.shoulderY = appState.analysis.coords.shoulderY * (1 - alpha) + shoulder.y * alpha;
                        }
                    }
                } catch (e) { console.error("AI frame estimation error:", e); }
            } else if (!appState.analysis.detector) { simulateDemoKeypoints(noise); }
        } else if (!isWebcamActive && appState.analysis.mode === 'ai') { simulateDemoKeypoints(noise); }
        else { appState.analysis.keypoints = []; }
        
        const earX = appState.analysis.coords.earX;
        const earY = appState.analysis.coords.earY;
        const shoulderX = appState.analysis.coords.shoulderX;
        const shoulderY = appState.analysis.coords.shoulderY;
        const dx = Math.abs(shoulderX - earX);
        const dy = shoulderY - earY;
        let measuredAngle = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));
        if (isNaN(measuredAngle)) measuredAngle = 45;
        measuredAngle = Math.max(15, Math.min(90, measuredAngle));
        
        let statusColor = "#FF5722";
        let assessmentText = "거북목 감지 (경계)";
        let turtleScore = Math.round(100 - (50 - measuredAngle) * 2.5);
        if (measuredAngle >= 52) {
            statusColor = "#4CAF50";
            assessmentText = "바른 정렬 (안전)";
            turtleScore = Math.round(85 + (measuredAngle - 52) * 0.4);
        } else if (measuredAngle < 40) {
            statusColor = "#F44336";
            assessmentText = "거북목 위험 (교정 요함)";
        }
        turtleScore = Math.max(10, Math.min(100, turtleScore));
        
        const viewBadge = document.getElementById('analysis-view-badge');
        const reportSide = document.getElementById('report-side-view');
        const reportFront = document.getElementById('report-front-view');
        const warningText = document.getElementById('analysis-warning-text');
        
        let shoulderAsymmetric = false;
        let pelvicAsymmetric = false;
        let kneeAsymmetric = false;
        
        let shoulderAngle = 0; let pelvicAngle = 0; let kneeAngle = 0;
        
        if (appState.analysis.isFrontView) {
            if (viewBadge) {
                viewBadge.innerText = "정면 (전신 대칭 분석)";
                viewBadge.className = "text-[10px] bg-green-500/10 text-green-600 px-2.5 py-0.5 rounded-full font-bold dark:text-green-400";
            }
            if (reportSide) reportSide.classList.add('hidden');
            if (reportFront) reportFront.classList.remove('hidden');
            if (warningText) warningText.innerText = "정면에서 몸을 똑바로 정렬하고 자세를 유지해 주세요.";
            
            const kps = appState.analysis.keypoints;
            const leftSh = kps.find(k => k.name === 'left_shoulder');
            const rightSh = kps.find(k => k.name === 'right_shoulder');
            const leftHp = kps.find(k => k.name === 'left_hip');
            const rightHp = kps.find(k => k.name === 'right_hip');
            const leftKn = kps.find(k => k.name === 'left_knee');
            const rightKn = kps.find(k => k.name === 'right_knee');
            
            if (leftSh && rightSh && leftSh.score > 0.3 && rightSh.score > 0.3) shoulderAngle = Math.abs(Math.atan2(rightSh.y - leftSh.y, rightSh.x - leftSh.x) * (180 / Math.PI));
            if (leftHp && rightHp && leftHp.score > 0.3 && rightHp.score > 0.3) pelvicAngle = Math.abs(Math.atan2(rightHp.y - leftHp.y, rightHp.x - leftHp.x) * (180 / Math.PI));
            if (leftKn && rightKn && leftKn.score > 0.3 && rightKn.score > 0.3) kneeAngle = Math.abs(Math.atan2(rightKn.y - leftKn.y, rightKn.x - leftKn.x) * (180 / Math.PI));
            
            const shoulderScore = Math.max(10, Math.min(100, Math.round(100 - shoulderAngle * 10)));
            const pelvicScore = Math.max(10, Math.min(100, Math.round(100 - pelvicAngle * 12)));
            const kneeScore = Math.max(10, Math.min(100, Math.round(100 - kneeAngle * 12)));
            
            const shLabel = document.getElementById('analysis-shoulder-balance'); const shBar = document.getElementById('analysis-shoulder-bar');
            const plLabel = document.getElementById('analysis-pelvic-balance'); const plBar = document.getElementById('analysis-pelvic-bar');
            const knLabel = document.getElementById('analysis-knee-balance'); const knBar = document.getElementById('analysis-knee-bar');
            
            let shColor = "#4CAF50"; let shText = "정상 (안전)";
            if (shoulderAngle > 6.0) { shColor = "#F44336"; shText = "불균형 (위험)"; shoulderAsymmetric = true; } else if (shoulderAngle > 3.0) { shColor = "#FF9800"; shText = "기울어짐 (경계)"; shoulderAsymmetric = true; }
            if (shLabel) { shLabel.innerText = `${shText} ${shoulderScore}점`; shLabel.style.color = shColor; }
            if (shBar) { shBar.style.width = `${shoulderScore}%`; shBar.style.backgroundColor = shColor; }
            
            let plColor = "#4CAF50"; let plText = "대칭 (안전)";
            if (pelvicAngle > 5.0) { plColor = "#F44336"; plText = "틀어짐 (위험)"; pelvicAsymmetric = true; } else if (pelvicAngle > 2.5) { plColor = "#FF9800"; plText = "약간 틀어짐 (경계)"; pelvicAsymmetric = true; }
            if (plLabel) { plLabel.innerText = `${plText} ${pelvicScore}점`; plLabel.style.color = plColor; }
            if (plBar) { plBar.style.width = `${pelvicScore}%`; plBar.style.backgroundColor = plColor; }
            
            let knColor = "#4CAF50"; let knText = "정상 (안전)";
            if (kneeAngle > 5.0) { knColor = "#F44336"; knText = "비대칭 (위험)"; kneeAsymmetric = true; } else if (kneeAngle > 2.5) { knColor = "#FF9800"; knText = "약간 비대칭 (경계)"; kneeAsymmetric = true; }
            if (knLabel) { knLabel.innerText = `${knText} ${kneeScore}점`; knLabel.style.color = knColor; }
            if (knBar) { knBar.style.width = `${kneeScore}%`; knBar.style.backgroundColor = knColor; }
        } else {
            if (viewBadge) {
                viewBadge.innerText = "측면 (목 정렬 분석)";
                viewBadge.className = "text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold";
            }
            if (reportSide) reportSide.classList.remove('hidden');
            if (reportFront) reportFront.classList.add('hidden');
            if (warningText) warningText.innerText = "측면 측정 시 귀와 어깨를 잇는 정렬 라인이 표시됩니다.";

            const angleLabel = document.getElementById('analysis-angle'); const angleBar = document.getElementById('analysis-angle-bar');
            const angleDesc = document.getElementById('analysis-angle-desc'); const scoreLabel = document.getElementById('analysis-turtle-score');
            const scoreBar = document.getElementById('analysis-turtle-bar'); const scoreDesc = document.getElementById('analysis-turtle-desc');
            
            if (angleLabel) { angleLabel.innerText = `${measuredAngle}°`; angleLabel.style.color = statusColor; }
            if (angleBar) { angleBar.style.width = `${(measuredAngle / 90) * 100}%`; angleBar.style.backgroundColor = statusColor; }
            if (angleDesc) angleDesc.innerHTML = `자세 판정: <strong style="color:${statusColor}">${assessmentText}</strong>`;
            if (scoreLabel) { scoreLabel.innerText = `${turtleScore}점`; scoreLabel.style.color = statusColor; }
            if (scoreBar) { scoreBar.style.width = `${turtleScore}%`; scoreBar.style.backgroundColor = statusColor; }
            if (scoreDesc) scoreDesc.innerText = `자세가 바를수록 100점에 가깝습니다.`;
            
            const kps = appState.analysis.keypoints;
            const leftSh = kps.find(k => k.name === 'left_shoulder');
            const rightSh = kps.find(k => k.name === 'right_shoulder');
            if (leftSh && rightSh && leftSh.score > 0.3 && rightSh.score > 0.3) {
                const dySh = rightSh.y - leftSh.y; const dxSh = rightSh.x - leftSh.x;
                const shAngle = Math.abs(Math.atan2(dySh, dxSh) * (180 / Math.PI));
                if (shAngle > 3.0) shoulderAsymmetric = true;
            }
        }
        
        appState.analysis.shoulderAsymmetric = shoulderAsymmetric;
        appState.analysis.pelvicAsymmetric = pelvicAsymmetric;
        appState.analysis.kneeAsymmetric = kneeAsymmetric;
        
        let skeletonHtml = '';
        if (appState.analysis.mode === 'ai' && appState.analysis.keypoints && appState.analysis.keypoints.length > 0) {
            const kps = appState.analysis.keypoints;
            POSE_CONNECTIONS.forEach(([p1Name, p2Name]) => {
                const p1 = kps.find(k => k.name === p1Name);
                const p2 = kps.find(k => k.name === p2Name);
                if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
                    let lineColor = "rgba(0, 240, 255, 0.45)"; let strokeWidth = 2; let strokeDash = "";
                    const isLeftCervical = (p1Name === 'left_ear' && p2Name === 'left_shoulder') || (p1Name === 'left_shoulder' && p2Name === 'left_ear');
                    const isRightCervical = (p1Name === 'right_ear' && p2Name === 'right_shoulder') || (p1Name === 'right_shoulder' && p2Name === 'right_ear');
                    const isShoulderLine = (p1Name === 'left_shoulder' && p2Name === 'right_shoulder') || (p1Name === 'right_shoulder' && p2Name === 'left_shoulder');
                    const isHipLine = (p1Name === 'left_hip' && p2Name === 'right_hip') || (p1Name === 'right_hip' && p2Name === 'left_hip');
                    const isKneeLine = (p1Name === 'left_knee' && p2Name === 'right_knee') || (p1Name === 'right_knee' && p2Name === 'left_knee');
                    
                    if (!appState.analysis.isFrontView && (isLeftCervical || isRightCervical)) { lineColor = statusColor; strokeWidth = 4.5; }
                    else if (isShoulderLine && shoulderAsymmetric) { lineColor = "#FF9800"; strokeWidth = 3; strokeDash = "4,4"; }
                    else if (isHipLine && pelvicAsymmetric) { lineColor = "#E91E63"; strokeWidth = 3; strokeDash = "4,4"; }
                    else if (isKneeLine && kneeAsymmetric) { lineColor = "#FF5722"; strokeWidth = 3; strokeDash = "4,4"; }
                    
                    skeletonHtml += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${lineColor}" stroke-width="${strokeWidth}" ${strokeDash ? `stroke-dasharray="${strokeDash}"` : ''} style="pointer-events: none;" />`;
                }
            });
            kps.forEach(kp => {
                if (kp.score > 0.3) {
                    let kpColor = "#00F0FF"; let kpRadius = 4.5;
                    if (kp.name === 'left_ear' || kp.name === 'right_ear') { kpColor = appState.analysis.isFrontView ? "#00F0FF" : statusColor; kpRadius = 6.5; }
                    else if (kp.name === 'left_shoulder' || kp.name === 'right_shoulder') { kpColor = shoulderAsymmetric ? "#FF9800" : "#2196F3"; kpRadius = 6.5; }
                    else if (kp.name === 'left_hip' || kp.name === 'right_hip') { kpColor = pelvicAsymmetric ? "#E91E63" : "#9C27B0"; kpRadius = 6.5; }
                    else if (kp.name === 'left_knee' || kp.name === 'right_knee') { kpColor = kneeAsymmetric ? "#FF5722" : "#4CAF50"; kpRadius = 6.5; }
                    skeletonHtml += `<circle cx="${kp.x}" cy="${kp.y}" r="${kpRadius}" fill="${kpColor}" stroke="white" stroke-width="1.5" style="pointer-events: none;" />`;
                }
            });
        }
        updateAnalysisPetSpeech(measuredAngle);
        if (!appState.analysis.isFrontView) {
            svg.innerHTML = `${skeletonHtml}
                <line x1="${shoulderX}" y1="50" x2="${shoulderX}" y2="300" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-dasharray="4" style="pointer-events: none;" />
                ${appState.analysis.mode === 'manual' ? `<line x1="${shoulderX}" y1="${shoulderY}" x2="${earX}" y2="${earY}" stroke="${statusColor}" stroke-width="3" style="pointer-events: none;" />` : ''}
                ${appState.analysis.mode === 'manual' ? `
                    <circle cx="${shoulderX}" cy="${shoulderY}" r="22" fill="rgba(0,0,0,0)" pointer-events="all" style="cursor: grab;" />
                    <circle cx="${shoulderX}" cy="${shoulderY}" r="7" fill="#2196F3" stroke="white" stroke-width="2" style="pointer-events: none;" />
                    ${appState.analysis.coords.activeDrag === 'shoulder' ? `<circle cx="${shoulderX}" cy="${shoulderY}" r="15" fill="none" stroke="#2196F3" stroke-width="1.5" stroke-dasharray="3" class="animate-spin" style="transform-origin: ${shoulderX}px ${shoulderY}px; pointer-events: none;" />` : ''}
                    <text x="${shoulderX + 15}" y="${shoulderY + 5}" fill="white" font-size="11" font-weight="bold" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" style="pointer-events: none;">어깨 지점</text>
                ` : ''}
                ${appState.analysis.mode === 'manual' ? `
                    <circle cx="${earX}" cy="${earY}" r="22" fill="rgba(0,0,0,0)" pointer-events="all" style="cursor: grab;" />
                    <circle cx="${earX}" cy="${earY}" r="7" fill="${statusColor}" stroke="white" stroke-width="2" style="pointer-events: none;" />
                    ${appState.analysis.coords.activeDrag === 'ear' ? `<circle cx="${earX}" cy="${earY}" r="15" fill="none" stroke="${statusColor}" stroke-width="1.5" stroke-dasharray="3" class="animate-spin" style="transform-origin: ${earX}px ${earY}px; pointer-events: none;" />` : ''}
                    <text x="${earX - 70}" y="${earY + 5}" fill="white" font-size="11" font-weight="bold" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" style="pointer-events: none;">귓볼 지점</text>
                ` : ''}
                <rect x="${(earX + shoulderX)/2 - 25}" y="${(earY + shoulderY)/2 - 10}" width="50" height="20" rx="5" fill="${statusColor}" style="pointer-events: none;" />
                <text x="${(earX + shoulderX)/2}" y="${(earY + shoulderY)/2 + 4}" fill="white" font-size="10" font-weight="bold" text-anchor="middle" style="pointer-events: none;">${measuredAngle}°</text>
            `;
        } else {
            // Draw horizontal reference alignment lines and labels for front view
            let frontGuidesHtml = '';
            const kps = appState.analysis.keypoints;
            const leftSh = kps.find(k => k.name === 'left_shoulder');
            const rightSh = kps.find(k => k.name === 'right_shoulder');
            const leftHp = kps.find(k => k.name === 'left_hip');
            const rightHp = kps.find(k => k.name === 'right_hip');
            const leftKn = kps.find(k => k.name === 'left_knee');
            const rightKn = kps.find(k => k.name === 'right_knee');
            
            if (leftSh && rightSh && leftSh.score > 0.3 && rightSh.score > 0.3) {
                const midY = (leftSh.y + rightSh.y) / 2;
                const shColor = shoulderAsymmetric ? (shoulderAngle > 6.0 ? "#F44336" : "#FF9800") : "#4CAF50";
                frontGuidesHtml += `<line x1="20" y1="${midY}" x2="620" y2="${midY}" stroke="${shColor}" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="3,3" style="pointer-events: none;" />`;
                frontGuidesHtml += `<text x="30" y="${midY - 8}" fill="${shColor}" font-size="10" font-weight="bold" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" style="pointer-events: none;">어깨 평행선 (기울기: ${shoulderAngle.toFixed(1)}°)</text>`;
            }
            if (leftHp && rightHp && leftHp.score > 0.3 && rightHp.score > 0.3) {
                const midY = (leftHp.y + rightHp.y) / 2;
                const plColor = pelvicAsymmetric ? (pelvicAngle > 5.0 ? "#F44336" : "#FF9800") : "#4CAF50";
                frontGuidesHtml += `<line x1="20" y1="${midY}" x2="620" y2="${midY}" stroke="${plColor}" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="3,3" style="pointer-events: none;" />`;
                frontGuidesHtml += `<text x="30" y="${midY - 8}" fill="${plColor}" font-size="10" font-weight="bold" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" style="pointer-events: none;">골반 평행선 (기울기: ${pelvicAngle.toFixed(1)}°)</text>`;
            }
            if (leftKn && rightKn && leftKn.score > 0.3 && rightKn.score > 0.3) {
                const midY = (leftKn.y + rightKn.y) / 2;
                const knColor = kneeAsymmetric ? (kneeAngle > 5.0 ? "#F44336" : "#FF9800") : "#4CAF50";
                frontGuidesHtml += `<line x1="20" y1="${midY}" x2="620" y2="${midY}" stroke="${knColor}" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="3,3" style="pointer-events: none;" />`;
                frontGuidesHtml += `<text x="30" y="${midY - 8}" fill="${knColor}" font-size="10" font-weight="bold" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" style="pointer-events: none;">무릎 평행선 (기울기: ${kneeAngle.toFixed(1)}°)</text>`;
            }
            
            svg.innerHTML = skeletonHtml + frontGuidesHtml;
        }
        if (appState.analysis.cameraStream || appState.analysis.scanInterval) requestAnimationFrame(drawLoop);
    };
    requestAnimationFrame(drawLoop);
}

function capturePosture() {
    const timerLabel = document.getElementById('diagnosis-timer');
    const captureBtn = document.getElementById('capture-posture-btn');
    const statusText = document.getElementById('scanning-status-text');
    
    if (!captureBtn) return;
    
    captureBtn.disabled = true;
    captureBtn.classList.add('opacity-50');
    if (timerLabel) {
        timerLabel.classList.remove('hidden');
        timerLabel.innerText = "00:05";
    }
    
    let timeRemaining = 5;
    
    const countInterval = setInterval(() => {
        timeRemaining--;
        if (timerLabel) timerLabel.innerText = `00:0${timeRemaining}`;
        
        if (statusText) statusText.innerText = `${timeRemaining}초간 자세를 유지해주세요...`;
        speakVoice(`${timeRemaining}초`);
        
        if (timeRemaining <= 0) {
            clearInterval(countInterval);
            if (timerLabel) timerLabel.classList.add('hidden');
            captureBtn.disabled = false;
            captureBtn.classList.remove('opacity-50');
            
            const finalAngleText = document.getElementById('analysis-angle') ? document.getElementById('analysis-angle').innerText : "-";
            const finalScoreText = document.getElementById('analysis-turtle-score') ? document.getElementById('analysis-turtle-score').innerText : "-";
            
            if (statusText) statusText.innerText = "분석 완료 및 리포트가 업데이트되었습니다.";
            speakVoice("자세 분석이 완료되었습니다.");
            
            const angleVal = parseInt(finalAngleText) || 45;
            const scoreVal = parseInt(finalScoreText) || 70;
            savePostureRecord(angleVal, scoreVal);
            
            let assessment = "거북목 감지 (경계)";
            let imgUrl = KODARI_IMAGES.panic;
            let advice = "회원님, 목이 조금 앞으로 기울어져 있어요. 귀와 어깨 라인이 수직이 되도록 턱을 가볍게 뒤로 당겨볼까요?";
            
            if (angleVal >= 52) {
                assessment = "바른 정렬 (안전)";
                imgUrl = KODARI_IMAGES.excited;
                advice = "정말 훌륭합니다! 완벽한 바른 자세 정렬 상태예요! 이 예쁘고 곧은 정렬을 앞으로도 잘 지켜보세요! ✨";
            } else if (angleVal < 40) {
                assessment = "거북목 위험 (교정 요함)";
                imgUrl = KODARI_IMAGES.crying;
                advice = "앗, 위험해요! 🚨 거북목 성향이 심해서 디스크가 눌리고 있어요. 허리를 곧게 펴고 저와 함께 멕켄지 스트레칭을 꼭 해주세요!";
            }
            
            openShareModal(angleVal, scoreVal, assessment, advice, imgUrl);
        }
    }, 1000);
}

function savePostureRecord(angle, score) {
    if (typeof savePostureRecordToStorage === 'function') {
        savePostureRecordToStorage(angle, score);
    }
}

// ==========================================
// PROFILE CHART & HISTORY LOCALSTORAGE DATABASE
// ==========================================

function saveSessionToLocalStorage(record) {
    let history = [];
    try {
        const stored = localStorage.getItem('neckcare_history_v2');
        if (stored) history = JSON.parse(stored);
    } catch (e) {
        console.error("Error reading history from localStorage:", e);
    }
    
    const now = new Date();
    const localDate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    record.timestamp = now.getTime();
    record.date = localDate;
    
    history.push(record);
    localStorage.setItem('neckcare_history_v2', JSON.stringify(history));
    
    recalculateDashboardStats();
}

function savePostureRecordToStorage(angle, score) {
    saveSessionToLocalStorage({
        type: "posture",
        angle: angle,
        score: score
    });
}

function seedDummyHistory() {
    if (localStorage.getItem('neckcare_history_v2') !== null) {
        return;
    }
    
    const dummyHistory = [];
    const now = new Date();
    const routines = ['mckenzie', 'shoulder_squeeze', 'side_stretch', 'doorway_chest'];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const timestamp = d.getTime();
        
        const exerciseCount = i === 0 ? 4 : Math.floor(Math.random() * 3) + 2;
        for (let j = 0; j < exerciseCount; j++) {
            const rId = routines[Math.floor(Math.random() * routines.length)];
            const rName = EXERCISE_ROUTINES.find(r => r.id === rId).name;
            dummyHistory.push({
                type: "exercise",
                timestamp: timestamp - j * 3600 * 1000,
                date: dateStr,
                routineId: rId,
                routineName: rName
            });
        }
        
        const simulatedAngle = 42 + (6 - i) * 2 + Math.floor(Math.random() * 3);
        const simulatedScore = Math.round(100 - (50 - simulatedAngle) * 2.5);
        dummyHistory.push({
            type: "posture",
            timestamp: timestamp - 12 * 3600 * 1000,
            date: dateStr,
            angle: Math.min(90, Math.max(30, simulatedAngle)),
            score: Math.min(100, Math.max(10, simulatedScore))
        });
    }
    
    localStorage.setItem('neckcare_history_v2', JSON.stringify(dummyHistory));
}

function recalculateDashboardStats() {
    let history = [];
    try {
        const stored = localStorage.getItem('neckcare_history_v2');
        if (stored) history = JSON.parse(stored);
    } catch (e) {}
    
    const totalCompleted = history.filter(r => r.type === 'exercise').length;
    appState.totalCompletedCount = totalCompleted;
    
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const todayCompleted = history.filter(r => r.date === todayStr && r.type === 'exercise').length;
    appState.dailyCompletedCount = todayCompleted;
    
    updateProgressUI();
    
    const postureChecks = history.filter(r => r.type === 'posture');
    let avgAngleStr = "48.2°";
    let avgScore = 82;
    
    if (postureChecks.length > 0) {
        const sumAngle = postureChecks.reduce((acc, r) => acc + r.angle, 0);
        const avgAngle = sumAngle / postureChecks.length;
        avgAngleStr = `${avgAngle.toFixed(1)}°`;
        
        const sumScore = postureChecks.reduce((acc, r) => acc + r.score, 0);
        avgScore = Math.round(sumScore / postureChecks.length);
    }
    
    const weekDates = getWeekDates();
    const attendanceDaysCount = weekDates.filter(dateStr => {
        return history.some(r => r.date === dateStr);
    }).length;
    
    const avgAngleLabel = document.getElementById('profile-avg-angle');
    const attendanceLabel = document.getElementById('profile-attendance-days');
    const scoreLabel = document.getElementById('profile-health-score');
    
    if (avgAngleLabel) avgAngleLabel.innerText = avgAngleStr;
    if (attendanceLabel) attendanceLabel.innerText = `${attendanceDaysCount}일`;
    if (scoreLabel) scoreLabel.innerText = `${avgScore}점`;
    
    // Update Samoyed Pet growth UI
    updatePetUI(totalCompleted);
}

function updatePetUI(totalCompleted) {
    // Determine growth stage:
    // Stage 1 (초보 코더): 0 ~ 1 completions
    // Stage 2 (자세 요정): 2 ~ 4 completions
    // Stage 3 (자세 마스터): 5+ completions
    
    let stage = 1;
    let growthTitle = "초보 메이트";
    let imgUrl = KODARI_IMAGES.salute;
    let remaining = 5;
    let percent = 0;
    let speechOptions = [];
    const eggs = Math.max(0, totalCompleted - 5);
    
    if (totalCompleted === 0) {
        stage = 1;
        growthTitle = "초보 메이트";
        imgUrl = KODARI_IMAGES.salute;
        remaining = 5;
        percent = 0;
        speechOptions = [
            "안녕하세요! 회원님의 전담 3D 자세 코치 민지입니다! 저와 함께 매일 목 건강 스트레칭을 시작해 볼까요? 🧘‍♀️",
            "바른 자세 정렬은 더 행복하고 편안한 하루를 위한 첫 단추입니다! 화이팅! 🌟"
        ];
    } else if (totalCompleted === 1) {
        stage = 1;
        growthTitle = "초보 메이트";
        imgUrl = KODARI_IMAGES.salute;
        remaining = 4;
        percent = 20;
        speechOptions = [
            "회원님! 첫 번째 스트레칭을 마쳤네요. 목과 어깨 주변이 가벼워진 걸 느껴 보세요! 🌟",
            "목 디스크 피로를 낮추고 건강을 돌보는 것은 어떤 일보다 소중한 자산입니다! 👏"
        ];
    } else if (totalCompleted === 2) {
        stage = 2;
        growthTitle = "수호 요정";
        imgUrl = KODARI_IMAGES.excited;
        remaining = 3;
        percent = 40;
        speechOptions = [
            "스트레칭 2회 완료! 운동 습관이 멋지게 정착되고 있어요. 굽은 어깨가 가볍게 풀립니다! 💖",
            "가슴을 넓게 활짝 펴고, 날개뼈를 부드럽게 등 뒤로 모아주는 힘을 기억하세요! 💖"
        ];
    } else if (totalCompleted === 3) {
        stage = 2;
        growthTitle = "수호 요정";
        imgUrl = KODARI_IMAGES.excited;
        remaining = 2;
        percent = 60;
        speechOptions = [
            "목 주변 정렬이 훨씬 조화롭고 곧게 유지되고 있는 모습이 보여서 무척 보람차요! 👍",
            "의자 끝에 엉덩이를 닿게 깊게 앉아 척추 커브를 만드는 것이 자세 코치의 특급 팁입니다! 👍"
        ];
    } else if (totalCompleted === 4) {
        stage = 2;
        growthTitle = "수호 요정";
        imgUrl = KODARI_IMAGES.excited;
        remaining = 1;
        percent = 80;
        speechOptions = [
            "우와! 한 번만 더 운동을 진행하시면 영광스러운 '자세 마스터' 레벨이 됩니다! 🌟",
            "마스터 등극 후에는 매 운동 완료 시마다 귀여운 칭찬 스티커를 가득 모으실 수 있어요! 두근두근!"
        ];
    } else {
        stage = 3;
        growthTitle = "자세 마스터";
        imgUrl = KODARI_IMAGES.success;
        remaining = 0;
        percent = 100;
        speechOptions = [
            `정말 축하합니다! 이제 최고 레벨인 '자세 마스터'이십니다! 매 완료 시 칭찬 스티커를 드릴게요! 🏅 (보유: ${eggs}개)`,
            `회원님의 일상 속 바른 경추 정렬은 정말 모범적이고 완벽해요! 칭찬 스티커가 쌓여갑니다! 🏆`,
            `오늘도 어깨 긴장을 풀고 날개뼈를 등 뒤로 꽉 모아 기분 좋게 시작해 보세요! 🧘‍♀️`
        ];
    }
    
    // Choose speech bubble
    const speechIndex = totalCompleted % speechOptions.length;
    const currentSpeech = speechOptions[speechIndex];
    
    // 1. Update Dashboard Tab elements
    const imgEl = document.getElementById('pet-image');
    const stageBadgeEl = document.getElementById('pet-stage-badge');
    const growthBadgeEl = document.getElementById('pet-growth-badge');
    const completionsBadgeEl = document.getElementById('pet-completions-badge');
    const speechEl = document.getElementById('pet-speech');
    const growthLabelEl = document.getElementById('pet-growth-label');
    const growthPercentEl = document.getElementById('pet-growth-percent');
    const growthBarEl = document.getElementById('pet-growth-bar');
    const eggsBadgeEl = document.getElementById('pet-eggs-badge');
    
    if (imgEl) {
        imgEl.src = imgUrl;
        imgEl.style.transform = `scale(1.0)`;
    }
    if (stageBadgeEl) stageBadgeEl.innerText = `${stage}단계`;
    if (growthBadgeEl) growthBadgeEl.innerText = growthTitle;
    if (completionsBadgeEl) completionsBadgeEl.innerText = `운동 ${totalCompleted}회`;
    if (eggsBadgeEl) eggsBadgeEl.innerText = `🏅 칭찬 스티커 ${eggs}개`;
    if (speechEl) speechEl.innerText = currentSpeech;
    
    if (stage === 3) {
        if (growthLabelEl) growthLabelEl.innerText = "최고 등급 달성! 자세 마스터 코치 🏆";
        if (growthPercentEl) growthPercentEl.innerText = "100%";
        if (growthBarEl) {
            growthBarEl.style.width = "100%";
            growthBarEl.className = "bg-yellow-500 h-full rounded-full transition-all duration-700 animate-pulse";
        }
    } else {
        if (growthLabelEl) growthLabelEl.innerText = `자세 마스터까지 운동 ${remaining}회 남음`;
        if (growthPercentEl) growthPercentEl.innerText = `${percent}%`;
        if (growthBarEl) {
            growthBarEl.style.width = `${percent}%`;
            growthBarEl.className = "bg-primary h-full rounded-full transition-all duration-700";
        }
    }
    
    // 2. Update Exercise Tab companion elements
    const playerPetImg = document.getElementById('player-pet-image');
    const playerPetBadge = document.getElementById('player-pet-badge');
    if (playerPetImg) {
        playerPetImg.src = imgUrl;
        playerPetImg.style.transform = `scale(1.0)`;
    }
    if (playerPetBadge) playerPetBadge.innerText = growthTitle;
    
    // 3. Update Analysis Tab companion elements
    const analysisPetImg = document.getElementById('analysis-pet-image');
    const analysisPetBadge = document.getElementById('analysis-pet-badge');
    if (analysisPetImg) {
        analysisPetImg.src = imgUrl;
        analysisPetImg.style.transform = `scale(1.0)`;
    }
    if (analysisPetBadge) analysisPetBadge.innerText = growthTitle;
    
    // 4. Update Profile Tab elements
    const profileEggsEl = document.getElementById('profile-golden-eggs');
    if (profileEggsEl) profileEggsEl.innerText = `${eggs}개`;
    
    const profilePetImg = document.getElementById('profile-pet-image');
    const profilePetStageBadge = document.getElementById('profile-pet-stage-badge');
    const profilePetGrowthText = document.getElementById('profile-pet-growth-text');
    const profilePetDesc = document.getElementById('profile-pet-desc');
    const profilePetProgressLabel = document.getElementById('profile-pet-progress-label');
    const profilePetProgressPercent = document.getElementById('profile-pet-progress-percent');
    const profilePetProgressBar = document.getElementById('profile-pet-progress-bar');
    
    if (profilePetImg) {
        profilePetImg.src = imgUrl;
        profilePetImg.style.transform = `scale(1.0)`;
    }
    if (profilePetStageBadge) profilePetStageBadge.innerText = `${stage}단계`;
    if (profilePetGrowthText) profilePetGrowthText.innerText = growthTitle;
    
    if (stage === 3) {
        if (profilePetDesc) profilePetDesc.innerText = `축하합니다! 민지 코치가 '자세 마스터' 등급에 도달했습니다! 이제 운동을 완료할 때마다 회원님께 귀여운 칭찬 스티커를 발급해 드려요.`;
        if (profilePetProgressLabel) profilePetProgressLabel.innerText = "마스터 등급 달성 완료!";
        if (profilePetProgressPercent) profilePetProgressPercent.innerText = "100%";
        if (profilePetProgressBar) {
            profilePetProgressBar.style.width = "100%";
            profilePetProgressBar.className = "bg-yellow-500 h-full rounded-full transition-all duration-700";
        }
    } else {
        if (profilePetDesc) profilePetDesc.innerText = "운동을 시작하면 민지 코치의 숙련 레벨이 상승합니다. 운동 5회를 완료하여 자세 케어 마스터가 되면, 이후 매 운동 완료 시마다 칭찬 스티커를 발급해 드립니다!";
        if (profilePetProgressLabel) profilePetProgressLabel.innerText = `자세 마스터까지 운동 ${remaining}회 필요`;
        if (profilePetProgressPercent) profilePetProgressPercent.innerText = `${percent}%`;
        if (profilePetProgressBar) {
            profilePetProgressBar.style.width = `${percent}%`;
            profilePetProgressBar.className = "bg-[#FF9800] h-full rounded-full transition-all duration-700";
        }
    }
}

function getWeekDates() {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        dates.push(dateStr);
    }
    return dates;
}

function renderHistoryLog() {
    const tbody = document.getElementById('history-log-tbody');
    if (!tbody) return;
    
    let history = [];
    try {
        const stored = localStorage.getItem('neckcare_history_v2');
        if (stored) history = JSON.parse(stored);
    } catch (e) {}
    
    if (history.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-on-surface-variant/70">아직 등록된 기록이 없습니다.</td>
            </tr>
        `;
        return;
    }
    
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    tbody.innerHTML = sorted.slice(0, 15).map(record => {
        const dateObj = new Date(record.timestamp);
        const timeStr = String(dateObj.getHours()).padStart(2, '0') + ':' + String(dateObj.getMinutes()).padStart(2, '0');
        const dateTimeFormatted = record.date + ' ' + timeStr;
        
        let typeBadge = "";
        let details = "";
        let result = "";
        
        if (record.type === 'exercise') {
            typeBadge = `<span class="bg-primary-fixed text-primary px-2 py-0.5 rounded font-bold text-[10px]">운동 완료</span>`;
            details = record.routineName;
            result = `<span class="text-primary font-bold">+1회 완료</span>`;
        } else {
            typeBadge = `<span class="bg-secondary-fixed text-secondary px-2 py-0.5 rounded font-bold text-[10px]">자세 검사</span>`;
            details = `목 정렬 각도 측정`;
            
            let color = "#FF5722";
            if (record.angle >= 52) color = "#4CAF50";
            else if (record.angle < 40) color = "#F44336";
            
            result = `<span style="color: ${color}" class="font-bold">${record.angle}° (${record.score}점)</span>`;
        }
        
        return `
            <tr class="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors">
                <td class="py-3 px-3 text-on-surface-variant font-mono">${dateTimeFormatted}</td>
                <td class="py-3 px-3">${typeBadge}</td>
                <td class="py-3 px-3 text-on-surface font-semibold">${details}</td>
                <td class="py-3 px-3 text-right font-semibold">${result}</td>
            </tr>
        `;
    }).join('');
}

function updateProfileChart() {
    let history = [];
    try {
        const stored = localStorage.getItem('neckcare_history_v2');
        if (stored) history = JSON.parse(stored);
    } catch (e) {}
    
    const weekDates = getWeekDates();
    const elements = document.querySelectorAll('#tab-profile .w-8');
    
    weekDates.forEach((dateStr, idx) => {
        const dayRecords = history.filter(r => r.date === dateStr && r.type === 'posture');
        
        let avgAngle = 0;
        if (dayRecords.length > 0) {
            const sum = dayRecords.reduce((acc, r) => acc + r.angle, 0);
            avgAngle = sum / dayRecords.length;
        }
        
        const bar = elements[idx];
        if (!bar) return;
        
        bar.style.height = '0px';
        
        setTimeout(() => {
            if (avgAngle > 0) {
                const height = 30 + (avgAngle / 90) * 150;
                bar.style.height = `${height}px`;
                
                if (avgAngle >= 52) {
                    bar.className = "w-8 bg-[#4CAF50] rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer";
                } else if (avgAngle < 40) {
                    bar.className = "w-8 bg-[#F44336] rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer";
                } else {
                    bar.className = "w-8 bg-[#FF5722] rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer";
                }
                bar.title = `${avgAngle.toFixed(1)}° (${dayRecords.length}회 측정)`;
            } else {
                bar.style.height = `30px`;
                bar.className = "w-8 bg-outline-variant/20 rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer";
                bar.title = "측정 기록 없음";
            }
        }, 100 + idx * 80);
    });
}

window.clearHistory = function() {
    if (confirm("정말 전체 자세 검사 및 운동 히스토리를 초기화하시겠습니까?")) {
        localStorage.removeItem('neckcare_history_v2');
        localStorage.removeItem('neckcare_completed_today');
        appState.dailyCompletedCount = 0;
        appState.totalCompletedCount = 0;
        
        updateProgressUI();
        recalculateDashboardStats();
        renderHistoryLog();
        updateProfileChart();
        speakVoice("기록이 성공적으로 초기화되었습니다.");
    }
};

// ==========================================
// STRETCHING REMINDERS AND WEB NOTIFICATION SYSTEM
// ==========================================

window.initAlarmSystem = function() {
    const enabled = localStorage.getItem('neckcare_alarm_enabled') === 'true';
    const interval = parseInt(localStorage.getItem('neckcare_alarm_interval') || '60');
    
    appState.alarm.enabled = enabled;
    appState.alarm.intervalMinutes = interval;
    
    const toggle = document.getElementById('alarm-toggle');
    if (toggle) toggle.checked = enabled;
    
    setAlarmUI(enabled);
    setAlarmIntervalUI(interval);
    
    if (enabled) {
        scheduleNextAlarm();
    }
    
    if (appState.alarm.checkTimer) clearInterval(appState.alarm.checkTimer);
    appState.alarm.checkTimer = setInterval(checkAlarmTimer, 5000);
};

window.toggleAlarmEnabled = function(enabled) {
    if (enabled) {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    appState.alarm.enabled = true;
                    localStorage.setItem('neckcare_alarm_enabled', 'true');
                    setAlarmUI(true);
                    scheduleNextAlarm();
                    speakVoice("정기 스트레칭 알림이 활성화되었습니다.");
                } else {
                    alert("알림을 받으시려면 브라우저 알림 권한을 승인해야 합니다.");
                    const toggle = document.getElementById('alarm-toggle');
                    if (toggle) toggle.checked = false;
                    toggleAlarmEnabled(false);
                }
            });
        } else {
            alert("이 브라우저는 알림 기능을 지원하지 않습니다.");
            const toggle = document.getElementById('alarm-toggle');
            if (toggle) toggle.checked = false;
            toggleAlarmEnabled(false);
        }
    } else {
        appState.alarm.enabled = false;
        localStorage.setItem('neckcare_alarm_enabled', 'false');
        appState.alarm.nextAlarmTime = null;
        setAlarmUI(false);
        speakVoice("스트레칭 알림이 해제되었습니다.");
        
        const label = document.getElementById('dashboard-next-alarm-label');
        if (label) label.innerText = "정기 알림 꺼짐";
    }
};

window.setAlarmInterval = function(minutes) {
    appState.alarm.intervalMinutes = minutes;
    localStorage.setItem('neckcare_alarm_interval', String(minutes));
    setAlarmIntervalUI(minutes);
    
    if (appState.alarm.enabled) {
        scheduleNextAlarm();
        speakVoice(`알림 간격이 ${minutes}분으로 설정되었습니다.`);
    }
};

function setAlarmUI(enabled) {
    const settingsBody = document.getElementById('alarm-settings-body');
    if (settingsBody) {
        if (enabled) {
            settingsBody.classList.remove('opacity-50', 'pointer-events-none');
        } else {
            settingsBody.classList.add('opacity-50', 'pointer-events-none');
        }
    }
}

function setAlarmIntervalUI(interval) {
    const btns = {
        15: 'interval-15-btn',
        30: 'interval-30-btn',
        60: 'interval-60-btn'
    };
    
    Object.keys(btns).forEach(key => {
        const btn = document.getElementById(btns[key]);
        if (!btn) return;
        
        if (parseInt(key) === interval) {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary shadow-sm transition-all btn-press";
        } else {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-on-surface-variant transition-all btn-press";
        }
    });
}

function scheduleNextAlarm() {
    const now = new Date();
    appState.alarm.nextAlarmTime = now.getTime() + appState.alarm.intervalMinutes * 60 * 1000;
    updateNextAlarmLabel();
}

window.testPushNotification = function() {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("NeckCare 알림", {
            body: "테스트 스트레칭 알림입니다! 지금 바로 바른 자세 코칭 운동을 시작하세요.",
            icon: "stitch_assets/images/08_mckenzie_detail_guide_ee3b077ccb274d53851b092272afdecd.png"
        });
        playAlarmChime();
    } else {
        alert("알림 설정 스위치를 켜서 알림 권한을 먼저 허용해 주세요!");
    }
};

function playAlarmChime() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.5);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
        console.error("Audio Context playback failed (needs user interaction):", e);
    }
}

function checkAlarmTimer() {
    if (!appState.alarm.enabled || !appState.alarm.nextAlarmTime) return;
    
    const now = new Date().getTime();
    if (now >= appState.alarm.nextAlarmTime) {
        triggerAlarm();
    }
    
    updateNextAlarmLabel();
}

function updateNextAlarmLabel() {
    const label = document.getElementById('dashboard-next-alarm-label');
    if (!label) return;
    
    if (!appState.alarm.enabled || !appState.alarm.nextAlarmTime) {
        label.innerText = "정기 알림 꺼짐";
        return;
    }
    
    const remainingMs = appState.alarm.nextAlarmTime - new Date().getTime();
    const remainingMins = Math.ceil(remainingMs / (60 * 1000));
    
    if (remainingMins <= 0) {
        label.innerText = "지금 스트레칭 시간!";
    } else if (remainingMins < 60) {
        label.innerText = `다음 정기 알림: ${remainingMins}분 후`;
    } else {
        const hours = Math.floor(remainingMins / 60);
        const mins = remainingMins % 60;
        label.innerText = `다음 정기 알림: ${hours}시간 ${mins > 0 ? mins + '분 ' : ''}후`;
    }
}

function triggerAlarm() {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("자세를 바르게 할 시간입니다! 🧘‍♂️", {
            body: "컴퓨터나 스마트폰을 멈추고 30초 동안 멕켄지 목 코칭 운동을 진행하세요.",
            icon: "stitch_assets/images/08_mckenzie_detail_guide_ee3b077ccb274d53851b092272afdecd.png",
            tag: "neckcare-stretch-alarm"
        });
    }
    
    playAlarmChime();
    speakVoice("자세를 바르게 정렬하고 스트레칭을 시작할 시간입니다.");
    
    scheduleNextAlarm();
}

window.toggleDarkMode = function() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('neckcare_dark_mode', isDark ? 'true' : 'false');
    
    const icon = document.getElementById('dark-mode-icon');
    if (icon) {
        icon.innerText = isDark ? "light_mode" : "dark_mode";
    }
    
    speakVoice(isDark ? "다크 모드가 적용되었습니다." : "라이트 모드가 적용되었습니다.");
};

function updatePlayerPetSpeech(stepIndex) {
    const speechEl = document.getElementById('player-pet-speech');
    if (!speechEl) return;
    
    let stage = 1;
    if (appState.totalCompletedCount >= 2 && appState.totalCompletedCount < 5) {
        stage = 2;
    } else if (appState.totalCompletedCount >= 5) {
        stage = 3;
    }
    
    let speech = "";
    if (appState.exercise.currentRoutineId === 'mckenzie') {
        if (stepIndex === 0) {
            if (stage === 1) speech = "회원님! 🧘‍♀️ 어깨 힘을 빼고 편안하게 척추를 세워 볼까요?";
            else if (stage === 2) speech = "아주 좋아요! 심호흡을 크게 한 번 하시고 가슴을 활짝 열어보세요! ✨";
            else speech = "민지 코치입니다! 🏆 오늘도 저와 함께 바른 정렬로 하루의 피로를 날려봐요! 🧘‍♀️";
        } else if (stepIndex === 1) {
            if (stage === 1) speech = "회원님! 목이 앞으로 쏠리면 디스크에 많은 부담이 가요. 주의해 주세요! 🚨";
            else if (stage === 2) speech = "귀와 어깨가 나란해지도록 턱을 아주 살짝만 뒤로 당겨볼게요! 척수 피로가 줄어들어요! 🌿";
            else speech = "정말 훌륭합니다! 🏆 머리의 무게 중심이 척추 위에 바르게 얹혀져 안정적이에요!";
        } else if (stepIndex === 2) {
            if (stage === 1) speech = "회원님! 구부정한 등을 펴고 계시는 모습이 정말 멋지십니다! 🧘‍♀️";
            else if (stage === 2) speech = "골반이 뒤로 눕지 않게 엉덩이를 의자 깊숙이 밀착해서 골반을 세워주세요! 🌿";
            else speech = "자세 코치 민지가 보증해요! 이상적인 척추 C자 정렬이 예쁘게 잡히고 있습니다!";
        } else if (stepIndex === 3) {
            if (stage === 1) speech = "회원님! 양 팔꿈치를 가볍게 굽히고 어깨선을 나란히 맞춰보세요! 🧘‍♀️";
            else if (stage === 2) speech = "일상생활에서 웅크리고 있던 가슴과 어깨 근육을 부드럽게 이완해요! ✨";
            else speech = "가슴을 활짝 열어 호흡을 편안하게 가다듬어 줍니다. 정말 잘하고 계세요!";
        } else if (stepIndex === 4) {
            if (stage === 1) speech = "회원님! 등 뒤 날개뼈(견갑골)가 맞닿을 만큼 꽉 모아보세요! 🧘‍♀️";
            else if (stage === 2) speech = "등 뒤 날개뼈 사이에 백만 불짜리 보물이 끼어있다고 생각하고 꽉 모아보세요! 🌿";
            else speech = "견갑골 수축! 굽은 어깨를 펴고 등 근육을 탄탄하게 잡아주는 핵심 과정입니다! 🏆";
        } else if (stepIndex === 5) {
            if (stage === 1) speech = "회원님! 날개뼈를 모은 상태 그대로 고개를 천천히 위로 젖혀 유지하세요! 🧘‍♀️";
            else if (stage === 2) speech = "목 뒤나 어깨가 뻐근하게 이완되는 자극을 느끼며 경추 C자 곡선을 늘려 줍니다! ✨";
            else speech = "디스크에 가해지던 과도한 압력이 시원하게 완화되고 있어요! 훌륭합니다! 🏆";
        }
    } else {
        // Fallback for other exercises
        if (stepIndex === 0) {
            if (stage === 1) speech = "회원님! 🧘‍♀️ 기분 좋은 정렬과 함께 오늘 코칭 스트레칭을 가볍게 시작해요!";
            else if (stage === 2) speech = "편안한 호흡과 함께 온몸에 맑은 에너지를 채워볼까요? ✨";
            else speech = "자세 마스터인 저와 함께하는 명품 힐링 스트레칭 시간입니다! 출발할까요? 🏆";
        } else if (stepIndex === 1) {
            if (stage === 1) speech = "회원님! 스트레칭되는 근육의 긴장이 이완되는 느낌에 부드럽게 집중해 보세요! 🧘‍♀️";
            else if (stage === 2) speech = "날개뼈를 끝까지 수축시키는 것과 어깨 정렬을 끝까지 기억하는 것이 중요해요! 🌿";
            else speech = "민지 코치가 보기에 완벽한 척추 수축 자세입니다! 좋습니다!";
        } else if (stepIndex === 2) {
            if (stage === 1) speech = "회원님! 무척 잘하고 계십니다! 통증이 없는 범위에서 편하게 유지하세요! 🧘‍♀️";
            else if (stage === 2) speech = "몸의 긴장이 풀리면서 묵직하던 뻐근함이 싹 풀리는 자극을 가만히 느껴 봅니다! ✨";
            else speech = "편안한 호흡과 함께 이 이상적인 정렬 자세를 3초간 가만히 유지해 줍니다! 🏆";
        } else {
            if (stage === 1) speech = "회원님! 정말 수고하셨습니다. 천천히 제자리로 돌아와 편하게 호흡하세요! 🧘‍♀️";
            else if (stage === 2) speech = "끝까지 호흡을 지긋이 내쉬며 어깨와 목의 남은 피로를 말끔히 풀어 줍니다! 🌿";
            else speech = "한 세트 완료! 회원님의 오늘 경추 케어 훈련 점수는 100점 만점에 100점입니다! 👑";
        }
    }
    
    speechEl.innerText = speech;
}

function updateAnalysisPetSpeech(angle) {
    const speechEl = document.getElementById('analysis-pet-speech');
    if (!speechEl) return;
    
    // Choose appropriate image based on posture angle
    const analysisPetImg = document.getElementById('analysis-pet-image');
    
    let stage = 1;
    if (appState.totalCompletedCount >= 2 && appState.totalCompletedCount < 5) {
        stage = 2;
    } else if (appState.totalCompletedCount >= 5) {
        stage = 3;
    }
    
    let speech = "";
    if (angle >= 52) {
        if (analysisPetImg) analysisPetImg.src = KODARI_IMAGES.excited;
        if (stage === 1) speech = "대표님! 🫡 아주 훌륭하고 바른 정렬 자세입니다! 나이스 샷!";
        else if (stage === 2) speech = "열정! 🔥 목 각도가 완벽한 C자 라인입니다! 흠잡을 데가 없네요!";
        else speech = "대표님! 🏆 완벽한 바른 자세입니다! 칭찬 스티커 적립 자격을 획득하셨습니다!";
    } else if (angle >= 40) {
        if (analysisPetImg) analysisPetImg.src = KODARI_IMAGES.panic;
        if (stage === 1) speech = "대표님... 목이 조금 쏠리셨습니다. 턱을 가볍게 수평으로 뒤로 밀어 넣어 보십시오!";
        else if (stage === 2) speech = "열정! 🔥 귀가 어깨선보다 앞으로 나가지 않도록 척추를 위로 세우셔야 합니다!";
        else speech = "경고 드립니다 대표님! 가슴을 활짝 열고 견갑골을 살짝 모아 어깨선을 맞추십시오! 🫡";
    } else {
        if (analysisPetImg) analysisPetImg.src = KODARI_IMAGES.crying;
        if (stage === 1) speech = "비상! 🚨 대표님 거북목 각도 위험 단계입니다! 즉시 목을 세우셔야 합니다!";
        else if (stage === 2) speech = "열정 상실! 🚨 거북목 위험입니다! 등을 똑바로 펴고 턱을 안쪽으로 강하게 당기세요!";
        else speech = "경추 압력 한계 초과! 🚨 대표님, 디스크가 찌그러지고 있습니다! 즉시 멕켄지 운동을 가동하십시오!";
    }
    
    // Add shoulder asymmetry warning if detected
    if (appState.analysis.shoulderAsymmetric) {
        speech += " (주의! 좌우 어깨 기울기가 비대칭입니다. 수평을 맞춰 근육 염좌를 예방하세요! ⚠️)";
    }
    
    speechEl.innerText = speech;
}

// ==========================================
// Three.js 3D Player & Mannequin Coaching Engine
// ==========================================

function initThreePlayer() {
    threeCanvas = document.getElementById('three-player-canvas');
    if (!threeCanvas) return;
    
    // If already initialized, just handle resizing and return
    if (isThreeInitialized) {
        resizeThreeRenderer();
        return;
    }
    
    // 1. Create Scene
    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x0b1120); // Dark premium slate-blue
    threeScene.fog = new THREE.FogExp2(0x0b1120, 0.08);
    
    // 2. Create Camera
    const container = document.getElementById('player-frame-container');
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;
    threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    threeCamera.position.set(0, 2.2, 5.5); // Positioned slightly high, looking down
    
    // 3. Create Renderer
    threeRenderer = new THREE.WebGLRenderer({
        canvas: threeCanvas,
        antialias: true,
        alpha: true
    });
    threeRenderer.setSize(width, height);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRenderer.shadowMap.enabled = true;
    threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
        threeControls = new THREE.OrbitControls(threeCamera, threeCanvas);
        threeControls.enableDamping = true;
        threeControls.dampingFactor = 0.05;
        threeControls.maxPolarAngle = Math.PI / 2 + 0.1;
        threeControls.minDistance = 2;
        threeControls.maxDistance = 15;
        threeControls.target.set(0, 1.2, 0); // Focus on chest level
    }
    
    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    threeScene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    threeScene.add(dirLight);
    
    // Neon glow accent lights
    const cyanLight = new THREE.PointLight(0x00f0ff, 1.5, 8);
    cyanLight.position.set(-2, 3, 2);
    threeScene.add(cyanLight);
    
    const pinkLight = new THREE.PointLight(0xff007f, 1.2, 8);
    pinkLight.position.set(2, 1, 2);
    threeScene.add(pinkLight);
    
    // 6. Ground grid
    const gridHelper = new THREE.GridHelper(10, 20, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = -0.5;
    threeScene.add(gridHelper);
    
    // 7. Build Mannequin Model
    buildMannequin();
    
    // 8. Resize Listener
    window.addEventListener('resize', resizeThreeRenderer);
    
    isThreeInitialized = true;
}

function resizeThreeRenderer() {
    if (!threeCanvas || !threeRenderer || !threeCamera) return;
    const container = document.getElementById('player-frame-container');
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    threeCamera.aspect = width / height;
    threeCamera.updateProjectionMatrix();
    
    threeRenderer.setSize(width, height);
}

function buildMannequin() {
    threeMannequin = new THREE.Group();
    threeMannequin.position.y = -0.5; // Floor offset
    threeScene.add(threeMannequin);
    
    // Glowing Neon Materials
    const boneMaterial = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x004455,
        roughness: 0.1,
        metalness: 0.8
    });
    
    const jointMaterial = new THREE.MeshStandardMaterial({
        color: 0xff007f,
        emissive: 0x550022,
        roughness: 0.1,
        metalness: 0.8
    });
    
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x0077ff,
        emissive: 0x002255,
        roughness: 0.2,
        metalness: 0.9,
        wireframe: true
    });
    
    const glassesMaterial = new THREE.MeshStandardMaterial({
        color: 0xffee00,
        emissive: 0x443300,
        roughness: 0.1,
        metalness: 1.0
    });
    
    // Build skeletal tree
    // Pelvis
    const pelvisJoint = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), jointMaterial);
    threeMannequin.add(pelvisJoint);
    threeMannequin.userData.pelvis = pelvisJoint;
    
    // Hip connector line
    const hipBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), boneMaterial);
    hipBar.rotation.z = Math.PI / 2;
    pelvisJoint.add(hipBar);
    
    // Spine
    threeMannequin.userData.spine = [];
    let parent = pelvisJoint;
    for (let i = 0; i < 5; i++) {
        const spineJoint = new THREE.Group();
        spineJoint.position.y = i === 0 ? 0.1 : 0.22;
        parent.add(spineJoint);
        threeMannequin.userData.spine.push(spineJoint);
        
        const jointSphere = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), jointMaterial);
        spineJoint.add(jointSphere);
        
        if (i < 4) {
            const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22), boneMaterial);
            bone.position.y = 0.11;
            spineJoint.add(bone);
        }
        
        parent = spineJoint;
    }
    
    const chestJoint = threeMannequin.userData.spine[4];
    
    // Neck & Head
    const neck = new THREE.Group();
    neck.position.y = 0.15;
    chestJoint.add(neck);
    threeMannequin.userData.neck = neck;
    
    const neckBone = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.15), boneMaterial);
    neckBone.position.y = 0.075;
    neck.add(neckBone);
    
    const head = new THREE.Group();
    head.position.y = 0.18;
    neck.add(head);
    threeMannequin.userData.head = head;
    
    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), headMaterial);
    headSphere.position.y = 0.08;
    head.add(headSphere);
    
    // Glasses decor (안경 쓴 코다리 스타일)
    const glassesGroup = new THREE.Group();
    glassesGroup.position.set(0, 0.08, 0.18);
    head.add(glassesGroup);
    
    const leftLens = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 16), glassesMaterial);
    leftLens.position.x = -0.07;
    glassesGroup.add(leftLens);
    
    const rightLens = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 16), glassesMaterial);
    rightLens.position.x = 0.07;
    glassesGroup.add(rightLens);
    
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), glassesMaterial);
    glassesGroup.add(bridge);
    
    const leftTemple = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.18), glassesMaterial);
    leftTemple.position.set(-0.11, 0, -0.09);
    glassesGroup.add(leftTemple);
    
    const rightTemple = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.18), glassesMaterial);
    rightTemple.position.set(0.11, 0, -0.09);
    glassesGroup.add(rightTemple);
    
    // Left Shoulder & Upper/Fore arm
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(-0.35, 0.08, 0);
    chestJoint.add(leftShoulder);
    threeMannequin.userData.leftShoulder = leftShoulder;
    
    const leftShoulderSphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), jointMaterial);
    leftShoulder.add(leftShoulderSphere);
    
    const shoulderLConnector = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35), boneMaterial);
    shoulderLConnector.rotation.z = Math.PI / 2;
    shoulderLConnector.position.x = 0.175;
    leftShoulder.add(shoulderLConnector);
    
    const leftUpperArm = new THREE.Group();
    leftShoulder.add(leftUpperArm);
    threeMannequin.userData.leftUpperArm = leftUpperArm;
    
    const leftUpperArmBone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.35), boneMaterial);
    leftUpperArmBone.position.y = -0.175;
    leftUpperArm.add(leftUpperArmBone);
    
    const leftElbow = new THREE.Group();
    leftElbow.position.set(0, -0.35, 0);
    leftUpperArm.add(leftElbow);
    threeMannequin.userData.leftElbow = leftElbow;
    
    const leftElbowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), jointMaterial);
    leftElbow.add(leftElbowSphere);
    
    const leftForearm = new THREE.Group();
    leftElbow.add(leftForearm);
    threeMannequin.userData.leftForearm = leftForearm;
    
    const leftForearmBone = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.3), boneMaterial);
    leftForearmBone.position.y = -0.15;
    leftForearm.add(leftForearmBone);
    
    // Right Shoulder & Upper/Fore arm
    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(0.35, 0.08, 0);
    chestJoint.add(rightShoulder);
    threeMannequin.userData.rightShoulder = rightShoulder;
    
    const rightShoulderSphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), jointMaterial);
    rightShoulder.add(rightShoulderSphere);
    
    const shoulderRConnector = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35), boneMaterial);
    shoulderRConnector.rotation.z = Math.PI / 2;
    shoulderRConnector.position.x = -0.175;
    rightShoulder.add(shoulderRConnector);
    
    const rightUpperArm = new THREE.Group();
    rightShoulder.add(rightUpperArm);
    threeMannequin.userData.rightUpperArm = rightUpperArm;
    
    const rightUpperArmBone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.35), boneMaterial);
    rightUpperArmBone.position.y = -0.175;
    rightUpperArm.add(rightUpperArmBone);
    
    const rightElbow = new THREE.Group();
    rightElbow.position.set(0, -0.35, 0);
    rightUpperArm.add(rightElbow);
    threeMannequin.userData.rightElbow = rightElbow;
    
    const rightElbowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), jointMaterial);
    rightElbow.add(rightElbowSphere);
    
    const rightForearm = new THREE.Group();
    rightElbow.add(rightForearm);
    threeMannequin.userData.rightForearm = rightForearm;
    
    const rightForearmBone = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.3), boneMaterial);
    rightForearmBone.position.y = -0.15;
    rightForearm.add(rightForearmBone);
}

function animateThreeMannequin() {
    if (!threeMannequin) return;
    
    // Initialize targets
    if (!threeMannequin.userData.targets) {
        threeMannequin.userData.targets = {
            spineX: [0, 0, 0, 0, 0],
            neckX: 0,
            neckZ: 0,
            headX: 0,
            headY: 0,
            headZ: 0,
            leftUpperArmX: 0,
            leftUpperArmZ: 0.1,
            leftElbowX: 0,
            rightUpperArmX: 0,
            rightUpperArmZ: -0.1,
            rightElbowX: 0,
            shoulderRetraction: 0,
            pelvisY: 0
        };
    }
    
    const targets = threeMannequin.userData.targets;
    
    // Reset defaults
    targets.spineX = [0, 0, 0, 0, 0];
    targets.neckX = 0;
    targets.neckZ = 0;
    targets.headX = 0;
    targets.headY = 0;
    targets.headZ = 0;
    targets.leftUpperArmX = 0;
    targets.leftUpperArmZ = 0.1;
    targets.leftElbowX = 0;
    targets.rightUpperArmX = 0;
    targets.rightUpperArmZ = -0.1;
    targets.rightElbowX = 0;
    targets.shoulderRetraction = 0;
    targets.pelvisY = 0;
    
    // Get step and progress
    const routineId = appState.exercise.currentRoutineId || 'mckenzie';
    const activeStep = appState.exercise.activeStep;
    const routine = EXERCISE_ROUTINES.find(r => r.id === routineId);
    let t = 0;
    if (routine) {
        const accumulated = routine.stepAccumulatedTimes[activeStep];
        const duration = routine.stepDurations[activeStep];
        const stepTime = appState.exercise.currentTime - accumulated;
        t = Math.max(0, Math.min(1, stepTime / duration));
    }
    
    if (routineId === 'mckenzie') {
        if (activeStep === 1) {
            // Step 1: 거북목 인지 (Neck tilts forward)
            targets.neckX = 0.22 * t;
            targets.headX = -0.08 * t;
        } else if (activeStep === 2) {
            // Step 2: 허리 세우고 등 펴기 (Spine straightens)
            targets.spineX = [-0.02 * t, -0.02 * t, -0.02 * t, -0.02 * t, -0.02 * t];
            targets.neckX = 0.22 * (1 - t);
            targets.headX = -0.08 * (1 - t);
        } else if (activeStep === 3) {
            // Step 3: 가슴 열기 (Raise arms, bend elbows)
            targets.spineX = [-0.03, -0.03, -0.03, -0.03, -0.03];
            targets.leftUpperArmZ = 0.1 * (1 - t) + (Math.PI / 2.6) * t;
            targets.rightUpperArmZ = -0.1 * (1 - t) - (Math.PI / 2.6) * t;
            targets.leftUpperArmX = (-Math.PI / 6) * t;
            targets.rightUpperArmX = (-Math.PI / 6) * t;
            targets.leftElbowX = (-Math.PI / 2) * t;
            targets.rightElbowX = (-Math.PI / 2) * t;
        } else if (activeStep === 4) {
            // Step 4: 날개뼈 수축 모으기 (Retract shoulders)
            targets.spineX = [-0.04, -0.04, -0.04, -0.04, -0.04];
            targets.leftUpperArmZ = Math.PI / 2.6;
            targets.rightUpperArmZ = -Math.PI / 2.6;
            targets.leftElbowX = -Math.PI / 2;
            targets.rightElbowX = -Math.PI / 2;
            
            targets.shoulderRetraction = 0.32 * t;
            targets.leftUpperArmX = -Math.PI / 6 - (0.45 * t);
            targets.rightUpperArmX = -Math.PI / 6 - (0.45 * t);
        } else if (activeStep === 5) {
            // Step 5: 고개 뒤로 젖히기 (Neck and head tilt back)
            targets.spineX = [-0.04 - 0.03 * t, -0.04 - 0.03 * t, -0.04 - 0.03 * t, -0.04 - 0.03 * t, -0.04 - 0.03 * t];
            targets.leftUpperArmZ = Math.PI / 2.6;
            targets.rightUpperArmZ = -Math.PI / 2.6;
            targets.leftElbowX = -Math.PI / 2;
            targets.rightElbowX = -Math.PI / 2;
            targets.shoulderRetraction = 0.32;
            targets.leftUpperArmX = -Math.PI / 6 - 0.45;
            targets.rightUpperArmX = -Math.PI / 6 - 0.45;
            
            targets.neckX = -0.45 * t;
            targets.headX = -0.35 * t;
        }
    } else if (routineId === 'shoulder_squeeze') {
        if (activeStep === 1) {
            targets.shoulderRetraction = 0.4 * t;
            targets.leftUpperArmX = -0.22 * t;
            targets.rightUpperArmX = -0.22 * t;
        } else if (activeStep === 2) {
            targets.shoulderRetraction = 0.4;
            targets.leftUpperArmX = -0.22;
            targets.rightUpperArmX = -0.22;
        }
    } else if (routineId === 'side_stretch') {
        if (activeStep === 1) {
            // Tilt left and raise left arm
            targets.neckZ = (Math.PI / 6) * t;
            targets.neckX = (Math.PI / 15) * t;
            targets.headZ = (Math.PI / 10) * t;
            targets.leftUpperArmZ = Math.PI * 0.72 * t;
            targets.leftElbowX = -Math.PI * 0.75 * t;
        } else if (activeStep === 2) {
            // Tilt right and raise right arm
            targets.neckZ = -(Math.PI / 6) * t;
            targets.neckX = (Math.PI / 15) * t;
            targets.headZ = -(Math.PI / 10) * t;
            targets.rightUpperArmZ = -Math.PI * 0.72 * t;
            targets.rightElbowX = -Math.PI * 0.75 * t;
        }
    } else if (routineId === 'doorway_chest') {
        // Initial pose: Arms up on door frame
        targets.leftUpperArmZ = Math.PI / 2.3;
        targets.rightUpperArmZ = -Math.PI / 2.3;
        targets.leftElbowX = -Math.PI / 2.1;
        targets.rightElbowX = -Math.PI / 2.1;
        
        if (activeStep === 1) {
            // Chest moves forward, arms stay back
            targets.leftUpperArmX = -0.42 * t;
            targets.rightUpperArmX = -0.42 * t;
            targets.spineX = [-0.03 * t, -0.03 * t, -0.03 * t, -0.03 * t, -0.03 * t];
        } else if (activeStep === 2) {
            // Squeeze shoulders further
            targets.leftUpperArmX = -0.42 - 0.18 * t;
            targets.rightUpperArmX = -0.42 - 0.18 * t;
            targets.shoulderRetraction = 0.3 * t;
            targets.spineX = [-0.03 - 0.02 * t, -0.03 - 0.02 * t, -0.03 - 0.02 * t, -0.03 - 0.02 * t, -0.03 - 0.02 * t];
        }
    } else if (routineId === 'standing_chin') {
        if (activeStep === 1) {
            // Chin tuck (neck slides back)
            targets.neckX = -0.16 * t;
            targets.headX = 0.18 * t;
            // Right arm raises to chin
            targets.rightUpperArmZ = -Math.PI / 4.2 * t;
            targets.rightUpperArmX = -Math.PI / 4 * t;
            targets.rightElbowX = -Math.PI / 2.2 * t;
        } else if (activeStep === 2) {
            // Lengthen spine upward
            targets.neckX = -0.16;
            targets.headX = 0.22;
            targets.spineX = [-0.02 * t, -0.02 * t, -0.02 * t, -0.02 * t, -0.02 * t];
        }
    }
    
    // Smooth interpolations
    const k = 0.08; // Interpolation speed constant
    const lerp = (cur, tar) => cur * (1 - k) + tar * k;
    
    // Spine
    for (let i = 0; i < 5; i++) {
        const joint = threeMannequin.userData.spine[i];
        if (joint) {
            const targetVal = targets.spineX[i] || 0;
            joint.rotation.x = lerp(joint.rotation.x, targetVal);
        }
    }
    
    // Neck & Head
    if (threeMannequin.userData.neck) {
        threeMannequin.userData.neck.rotation.x = lerp(threeMannequin.userData.neck.rotation.x, targets.neckX);
        threeMannequin.userData.neck.rotation.z = lerp(threeMannequin.userData.neck.rotation.z, targets.neckZ);
    }
    if (threeMannequin.userData.head) {
        threeMannequin.userData.head.rotation.x = lerp(threeMannequin.userData.head.rotation.x, targets.headX);
        threeMannequin.userData.head.rotation.y = lerp(threeMannequin.userData.head.rotation.y, targets.headY);
        threeMannequin.userData.head.rotation.z = lerp(threeMannequin.userData.head.rotation.z, targets.headZ);
    }
    
    // Shoulders (retraction)
    const leftSh = threeMannequin.userData.leftShoulder;
    const rightSh = threeMannequin.userData.rightShoulder;
    if (leftSh && rightSh) {
        leftSh.rotation.y = lerp(leftSh.rotation.y, -targets.shoulderRetraction);
        rightSh.rotation.y = lerp(rightSh.rotation.y, targets.shoulderRetraction);
        
        // Shoulder Squeeze - Shrug downward offset
        const targetShY = (routineId === 'shoulder_squeeze' && activeStep === 2) ? 0.08 - 0.05 * t : 0.08;
        leftSh.position.y = lerp(leftSh.position.y, targetShY);
        rightSh.position.y = lerp(rightSh.position.y, targetShY);
    }
    
    // Arms
    if (threeMannequin.userData.leftUpperArm) {
        threeMannequin.userData.leftUpperArm.rotation.x = lerp(threeMannequin.userData.leftUpperArm.rotation.x, targets.leftUpperArmX);
        threeMannequin.userData.leftUpperArm.rotation.z = lerp(threeMannequin.userData.leftUpperArm.rotation.z, targets.leftUpperArmZ);
    }
    if (threeMannequin.userData.rightUpperArm) {
        threeMannequin.userData.rightUpperArm.rotation.x = lerp(threeMannequin.userData.rightUpperArm.rotation.x, targets.rightUpperArmX);
        threeMannequin.userData.rightUpperArm.rotation.z = lerp(threeMannequin.userData.rightUpperArm.rotation.z, targets.rightUpperArmZ);
    }
    if (threeMannequin.userData.leftElbow) {
        threeMannequin.userData.leftElbow.rotation.x = lerp(threeMannequin.userData.leftElbow.rotation.x, targets.leftElbowX);
    }
    if (threeMannequin.userData.rightElbow) {
        threeMannequin.userData.rightElbow.rotation.x = lerp(threeMannequin.userData.rightElbow.rotation.x, targets.rightElbowX);
    }
}

// ==========================================
// RESULT SHARE MODAL & TOAST HELPER FUNCTIONS
// ==========================================

window.openShareModal = function(angle, score, assessmentText, speechText, imgUrl) {
    const modal = document.getElementById('share-modal');
    if (!modal) return;
    const card = modal.querySelector('.glass-card');
    
    // Set data
    document.getElementById('share-modal-angle').innerText = `${angle}°`;
    document.getElementById('share-modal-score').innerText = `${score}점`;
    document.getElementById('share-modal-assessment').innerText = assessmentText;
    document.getElementById('share-modal-speech').innerText = speechText;
    document.getElementById('share-modal-pet-img').src = imgUrl;
    
    // Set assessment class/color
    const assessEl = document.getElementById('share-modal-assessment');
    if (angle >= 52) {
        assessEl.className = "text-sm font-black mb-4 text-[#4CAF50]";
    } else if (angle < 40) {
        assessEl.className = "text-sm font-black mb-4 text-[#F44336]";
    } else {
        assessEl.className = "text-sm font-black mb-4 text-[#FF5722]";
    }

    // Show modal
    modal.classList.remove('hidden');
    // For transition
    setTimeout(() => {
        modal.classList.add('opacity-100');
        if (card) card.classList.add('scale-100', 'opacity-100');
    }, 50);
};

window.closeShareModal = function() {
    const modal = document.getElementById('share-modal');
    if (!modal) return;
    const card = modal.querySelector('.glass-card');
    
    modal.classList.remove('opacity-100');
    if (card) card.classList.remove('scale-100', 'opacity-100');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.shareResultLink = function() {
    const angle = document.getElementById('share-modal-angle').innerText;
    const score = document.getElementById('share-modal-score').innerText;
    const assessment = document.getElementById('share-modal-assessment').innerText;
    
    const shareText = `🧘‍♂️ [NeckCare] AI 자세 진단 결과 보고서\n\n내 목 각도: ${angle}\n자세 점수: ${score}\n진단 결과: ${assessment}\n\n바른 자세 목/허리 케어 메이트 'NeckCare'에서 5초만에 실시간 AI 자세 진단을 받아보세요! 🚀👇\n${window.location.origin + window.location.pathname}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'NeckCare AI 자세 진단',
            text: shareText,
            url: window.location.href
        }).then(() => {
            showToast("결과를 공유했습니다!");
        }).catch(err => {
            console.log("Sharing failed, copying to clipboard:", err);
            copyShareTextToClipboard(shareText);
        });
    } else {
        copyShareTextToClipboard(shareText);
    }
};

function copyShareTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("공유 문구와 링크가 클립보드에 복사되었습니다! 친구에게 보내보세요. 🫡");
    }).catch(err => {
        console.error("Clipboard copy failed:", err);
        alert("링크 복사에 실패했습니다. 아래 텍스트를 복사해서 공유해보세요:\n\n" + text);
    });
}

window.showToast = function(msg) {
    const toast = document.getElementById('toast-message');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;
    
    toastText.innerText = msg;
    toast.classList.remove('hidden');
    // Force reflow
    toast.offsetHeight;
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3500);
};

// Expose functions to the global window scope for inline HTML handlers in Vite environment
window.switchTab = switchTab;
window.startExercisePlayer = startExercisePlayer;
window.togglePlayerViewMode = togglePlayerViewMode;
window.toggleSound = toggleSound;
window.completeExercise = completeExercise;
window.scrubTimeline = scrubTimeline;
window.prevStep = prevStep;
window.togglePlay = togglePlay;
window.nextStep = nextStep;
window.restartPlayer = restartPlayer;
window.jumpToStep = jumpToStep;
window.startCamera = startCamera;
window.capturePosture = capturePosture;
window.setDetectionMode = setDetectionMode;
window.clearHistory = clearHistory;
window.closeShareModal = closeShareModal;
window.shareResultLink = shareResultLink;
window.toggleDarkMode = toggleDarkMode;
window.setAlarmInterval = setAlarmInterval;
window.testPushNotification = testPushNotification;

