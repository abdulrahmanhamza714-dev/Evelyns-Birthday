"use strict";

/* =========================================================
   ISABELLA OPERATING SYSTEM
   Birthday OS for Evelyn
   ========================================================= */

(() => {
  /* =======================================================
     CONFIG
     ======================================================= */

  const CONFIG = {
    storageKey: "isabellaOS",
    bootFallbackMs: 9000,
    birthdayMonth: 8,
    birthdayDay: 19
  };

  /* =======================================================
     SUNO SONGS
     ======================================================= */

  const SONGS = {
    birthday: {
      id: "birthday",
      title: "Happy Birthday Evelyn",
      artist: "Hamza",
      category: "BIRTHDAY SONG",
      icon: "🎂",
      url: "https://suno.com/s/oskO71P4tGUEwqMf"
    },
    story: {
      id: "story",
      title: "The Story We Remember",
      artist: "Hamza",
      category: "STORY SONG",
      icon: "📖",
      url: "https://suno.com/s/hliMmIbnuyMSpAxc"
    }
  };

  /* =======================================================
     OPTIONAL SOUND URLS
     ======================================================= */

  const SOUND_URLS = {
    click: "",
    soft: "",
    pop: "",
    birthday: ""
  };

  /* =======================================================
     HELPERS
     ======================================================= */

  const $ = (selector, parent = document) => {
    return parent.querySelector(selector);
  };

  const $$ = (selector, parent = document) => {
    return Array.from(parent.querySelectorAll(selector));
  };

  const delay = ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const safeCall = (fn, fallback = null) => {
    try {
      return fn();
    } catch (error) {
      console.warn("[Isabella OS]", error);
      return fallback;
    }
  };

  /* =======================================================
     DOM
     ======================================================= */

  const screens = {
    boot: $("#bootScreen"),
    intro: $("#introScreen"),
    home: $("#homeScreen"),
    memories: $("#memoriesScreen"),
    room: $("#roomScreen"),
    stories: $("#storiesScreen"),
    birthday: $("#birthdayScreen")
  };

  /* =======================================================
     DEFAULT STATE
     ======================================================= */

  const DEFAULT_STATE = {
    bootCompleted: false,
    introSeen: false,
    birthdayUnlocked: false,
    birthdayWished: false,
    roomVisits: 0,
    memoriesOpened: [],
    storiesOpened: [],
    roomDiscoveries: [],
    secretFound: false,
    finalSecretFound: false,
    lastScreen: "boot",
    lastSong: null
  };

  let state = loadState();
  let initialized = false;
  let bootRunning = false;
  let bootTimer = null;
  let birthdayClockTimer = null;
  let audioContext = null;
  let currentScreen = "boot";
  let dialogueIndex = 0;
  let guideIndex = 0;
  let toastTimer = null;

  /* =======================================================
     STATE
     ======================================================= */

  function loadState() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);

      if (!saved) {
        return { ...DEFAULT_STATE };
      }

      const parsed = JSON.parse(saved);

      return {
        ...DEFAULT_STATE,
        ...parsed,
        memoriesOpened: Array.isArray(parsed.memoriesOpened)
          ? parsed.memoriesOpened
          : [],
        storiesOpened: Array.isArray(parsed.storiesOpened)
          ? parsed.storiesOpened
          : [],
        roomDiscoveries: Array.isArray(parsed.roomDiscoveries)
          ? parsed.roomDiscoveries
          : []
      };
    } catch (error) {
      console.warn("[Isabella OS] Could not load saved state.", error);
      return { ...DEFAULT_STATE };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn("[Isabella OS] Could not save state.", error);
    }
  }

  /* =======================================================
     DATE / BIRTHDAY
     ======================================================= */

  function getBirthdayStatus() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    if (
      currentMonth === CONFIG.birthdayMonth &&
      currentDay === CONFIG.birthdayDay
    ) {
      return "active";
    }

    const birthdayThisYear = new Date(
      now.getFullYear(),
      CONFIG.birthdayMonth,
      CONFIG.birthdayDay,
      0,
      0,
      0
    );

    return now < birthdayThisYear
      ? "preparing"
      : "archived";
  }

  function getBirthdayLabel() {
    const status = getBirthdayStatus();

    if (status === "active") {
      return "Birthday Protocol: ACTIVE 🎂";
    }

    if (status === "preparing") {
      return "Birthday Protocol: PREPARING";
    }

    return "Birthday Protocol: ARCHIVED";
  }

  function updateBirthdayInterface() {
    const status = getBirthdayStatus();

    const protocolText = $("#protocolText");
    const protocolPill = $("#protocolPill");

    if (protocolText) {
      protocolText.textContent = getBirthdayLabel();
    }

    if (protocolPill) {
      protocolPill.dataset.status = status;
    }

    const kicker = $(".hero-kicker");
    const title = $(".hero-title");
    const subtitle = $(".hero-subtitle");

    if (status === "active") {
      if (kicker) {
        kicker.textContent = "Birthday Protocol: ACTIVE";
      }

      if (title) {
        title.innerHTML = "HAPPY BIRTHDAY, <span>EVELYN</span>";
      }

      if (subtitle) {
        subtitle.textContent =
          "Evelyn, Isabella has been waiting for you. 🎂";
      }
    } else if (status === "preparing") {
      if (kicker) {
        kicker.textContent = "Birthday Protocol: PREPARING";
      }

      if (title) {
        title.innerHTML = "SOMETHING IS <span>LOADING</span>";
      }

      if (subtitle) {
        subtitle.textContent =
          "Isabella is getting everything ready...";
      }
    } else {
      if (kicker) {
        kicker.textContent = "Birthday Protocol: ARCHIVED";
      }

      if (title) {
        title.innerHTML = "HAPPY BIRTHDAY, <span>EVELYN</span>";
      }

      if (subtitle) {
        subtitle.textContent =
          "The birthday file remains safely stored in Isabella OS.";
      }
    }

    const birthdayCardTitle = $(".birthday-card-title");

    if (birthdayCardTitle) {
      birthdayCardTitle.textContent =
        status === "active"
          ? "Your Birthday File 🎂"
          : "Birthday File";
    }

    const birthdayCardText = $(".birthday-card-text");

    if (birthdayCardText) {
      birthdayCardText.textContent =
        status === "active"
          ? "Isabella has prepared something especially for today."
          : "There is still something waiting inside.";
    }

    const birthdayKicker = $(".birthday-kicker");

    if (birthdayKicker) {
      birthdayKicker.textContent = getBirthdayLabel();
    }
  }

  /* =======================================================
     SCREEN NAVIGATION
     ======================================================= */

  function showScreen(name, options = {}) {
    const target = screens[name];

    if (!target) {
      console.warn(
        `[Isabella OS] Screen "${name}" does not exist.`
      );
      return false;
    }

    Object.entries(screens).forEach(([key, screen]) => {
      if (!screen) {
        return;
      }

      const active = key === name;

      if (
        !active &&
        screen.contains(document.activeElement)
      ) {
        safeCall(() => {
          document.activeElement.blur();
        });
      }

      screen.classList.toggle("active", active);
      screen.hidden = !active;

      screen.setAttribute(
        "aria-hidden",
        active ? "false" : "true"
      );
    });

    currentScreen = name;
    state.lastScreen = name;

    if (!options.skipSave) {
      saveState();
    }

    document.body.dataset.screen = name;

    window.scrollTo({
      top: 0,
      behavior: "auto"
    });

    return true;
  }

  /* =======================================================
     AUDIO
     ======================================================= */

  function initializeAudio() {
    const backgroundAudio = $("#backgroundAudio");

    if (!backgroundAudio) {
      return;
    }

    backgroundAudio.volume = 0.18;

    backgroundAudio.onerror = () => {
      console.warn(
        "[Isabella OS] Background audio unavailable."
      );
    };
  }

  function getAudioContext() {
    if (audioContext) {
      return audioContext;
    }

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        return null;
      }

      audioContext = new AudioContext();

      return audioContext;
    } catch (error) {
      console.warn(
        "[Isabella OS] Web Audio unavailable.",
        error
      );

      return null;
    }
  }

  function playTone(
    frequency = 500,
    duration = 0.06,
    volume = 0.025,
    type = "sine"
  ) {
    const ctx = getAudioContext();

    if (!ctx) {
      return;
    }

    try {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(
        0.0001,
        ctx.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        Math.max(volume, 0.0001),
        ctx.currentTime + 0.01
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();

      oscillator.stop(
        ctx.currentTime + duration + 0.02
      );
    } catch (error) {
      console.warn(
        "[Isabella OS] Tone failed.",
        error
      );
    }
  }

  function playSound(type = "click") {
    const url = SOUND_URLS[type];

    if (url) {
      try {
        const audio = new Audio(url);

        audio.volume =
          type === "birthday"
            ? 0.45
            : 0.25;

        audio.play().catch(() => {
          playFallbackSound(type);
        });

        return;
      } catch (error) {
        console.warn(
          "[Isabella OS] Remote sound failed.",
          error
        );
      }
    }

    playFallbackSound(type);
  }

  function playFallbackSound(type) {
    switch (type) {
      case "click":
        playTone(620, 0.045, 0.025);
        break;

      case "soft":
        playTone(430, 0.08, 0.018);
        break;

      case "pop":
        playTone(760, 0.055, 0.03);
        break;

      case "birthday":
        playTone(523, 0.12, 0.03);

        setTimeout(() => {
          playTone(659, 0.12, 0.03);
        }, 100);

        setTimeout(() => {
          playTone(784, 0.18, 0.035);
        }, 210);
        break;

      default:
        playTone(500, 0.05, 0.02);
    }
  }

  function startBackgroundAudio() {
    const audio = $("#backgroundAudio");

    if (!audio) {
      return;
    }

    try {
      audio.volume = 0.16;
      audio.play().catch(() => {});
    } catch (error) {
      console.warn(
        "[Isabella OS] Background audio could not start.",
        error
      );
    }
  }

  /* =======================================================
     SPEECH
     ======================================================= */

  const voiceProfiles = {
    teddy: {
      rate: 0.86,
      pitch: 1.22,
      volume: 0.88
    },
    cute: {
      rate: 0.82,
      pitch: 1.28,
      volume: 0.86
    },
    playful: {
      rate: 0.91,
      pitch: 1.25,
      volume: 0.9
    },
    soft: {
      rate: 0.78,
      pitch: 1.18,
      volume: 0.72
    },
    excited: {
      rate: 0.96,
      pitch: 1.3,
      volume: 0.92
    },
    system: {
      rate: 0.82,
      pitch: 1.04,
      volume: 0.72
    }
  };

  function getPreferredVoice() {
    if (!("speechSynthesis" in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();

    if (!voices.length) {
      return null;
    }

    const preferredNames = [
      "Samantha",
      "Google UK English Female",
      "Google US English Female",
      "Microsoft Zira",
      "Microsoft Aria",
      "Microsoft Jenny"
    ];

    for (const name of preferredNames) {
      const match = voices.find(voice =>
        voice.name
          .toLowerCase()
          .includes(name.toLowerCase())
      );

      if (match) {
        return match;
      }
    }

    return (
      voices.find(
        voice =>
          voice.lang &&
          voice.lang
            .toLowerCase()
            .startsWith("en")
      ) || voices[0]
    );
  }

  function speak(text, profile = "teddy") {
    if (!text) {
      return;
    }

    if (!("speechSynthesis" in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const settings =
        voiceProfiles[profile] ||
        voiceProfiles.teddy;

      const utterance =
        new SpeechSynthesisUtterance(text);

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      const voice = getPreferredVoice();

      if (voice) {
        utterance.voice = voice;
      }

      const voiceStatus = $("#voiceStatus");
      const voiceStatusText = $("#voiceStatusText");

      if (voiceStatus) {
        voiceStatus.classList.add("speaking");
      }

      if (voiceStatusText) {
        voiceStatusText.textContent =
          "Isabella is speaking...";
      }

      utterance.onend = () => {
        if (voiceStatus) {
          voiceStatus.classList.remove("speaking");
        }

        if (voiceStatusText) {
          voiceStatusText.textContent =
            "Isabella is ready.";
        }
      };

      utterance.onerror = () => {
        if (voiceStatus) {
          voiceStatus.classList.remove("speaking");
        }

        if (voiceStatusText) {
          voiceStatusText.textContent =
            "Isabella is ready.";
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn(
        "[Isabella OS] Speech failed.",
        error
      );
    }
  }

  /* =======================================================
     BOOT
     ======================================================= */

  const bootSteps = [
    {
      progress: 12,
      text: "Starting Isabella Operating System...",
      wait: 650
    },
    {
      progress: 28,
      text: "Preparing birthday protocol...",
      wait: 650
    },
    {
      progress: 45,
      text: "Loading Evelyn's birthday...",
      wait: 700
    },
    {
      progress: 61,
      text: "Opening memory archive...",
      wait: 650
    },
    {
      progress: 77,
      text: "Checking Isabella's room...",
      wait: 650
    },
    {
      progress: 91,
      text: "Waking Isabella...",
      wait: 700
    },
    {
      progress: 100,
      text: "Isabella is ready.",
      wait: 500
    }
  ];

  function updateBootUI(progress, text) {
    const bar = $("#bootProgressBar");
    const status = $("#bootStatus");

    if (bar) {
      bar.style.width = `${progress}%`;
    }

    if (status) {
      status.textContent = text;
    }
  }

  async function runBootSequence() {
    if (bootRunning) {
      return;
    }

    bootRunning = true;

    clearTimeout(bootTimer);

    bootTimer = setTimeout(() => {
      if (currentScreen === "boot") {
        console.warn(
          "[Isabella OS] Boot fallback triggered."
        );

        finishBoot();
      }
    }, CONFIG.bootFallbackMs);

    try {
      for (const step of bootSteps) {
        updateBootUI(
          step.progress,
          step.text
        );

        await delay(step.wait);
      }

      finishBoot();
    } catch (error) {
      console.error(
        "[Isabella OS] Boot sequence error:",
        error
      );

      finishBoot();
    }
  }

  function finishBoot() {
    clearTimeout(bootTimer);

    bootRunning = false;
    state.bootCompleted = true;

    saveState();

    updateBootUI(
      100,
      "Isabella is ready."
    );

    setTimeout(() => {
      showScreen("intro");
      initializeIntro();
    }, 250);
  }

  /* =======================================================
     INTRO
     ======================================================= */

  function typeText(element, text, speed = 24) {
    if (!element) {
      return;
    }

    element.textContent = "";

    let index = 0;

    const interval = setInterval(() => {
      element.textContent += text[index];
      index++;

      if (index >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return interval;
  }

  function initializeIntro() {
    const introText = $("#introText");

    if (!introText) {
      return;
    }

    const introMessage =
      "Hi Evelyn. 🐻❤️ I'm Isabella. " +
      "Well... the digital version of Isabella. " +
      "The original one may have gotten lost somewhere " +
      "in a car... 😭 " +
      "So until she's found again, I'll be here keeping " +
      "the memories safe. " +
      "Welcome to my little world.";

    typeText(
      introText,
      introMessage,
      20
    );
  }

  function enterSystem() {
    state.introSeen = true;
    saveState();

    playSound("pop");
    showScreen("home");
    startBackgroundAudio();

    updateGuide(
      "Evelyn... I prepared something for you. 🎂"
    );

    setTimeout(() => {
      speak(
        "Evelyn! You came! " +
        "Wait... do you know what today is? " +
        "It's your birthday! " +
        "And Hamza made this little world especially for you. " +
        "So I guess that makes me your birthday guide. " +
        "Welcome to your little world, Evelyn.",
        "excited"
      );
    }, 450);
  }

  /* =======================================================
     HOME / GUIDE
     ======================================================= */

  const guideLines = [
    "Evelyn... I prepared something for you. 🎂",
    "You haven't opened your birthday file yet. 👀",
    "I think you should check the memories next.",
    "Okay, okay... I have one more surprise.",
    "Don't worry. I'll be here.",
    "This little world belongs to you today. 🐻❤️"
  ];

  function updateGuide(text) {
    const guideText = $("#guideText");

    if (!guideText) {
      return;
    }

    guideText.textContent = text;
  }

  function nextGuideLine() {
    guideIndex =
      (guideIndex + 1) % guideLines.length;

    updateGuide(
      guideLines[guideIndex]
    );
  }

  /* =======================================================
     MEMORIES
     ======================================================= */

  const memories = {
    shs: {
      icon: "🎓",
      category: "SHS ARCHIVE",
      title: "The Beginning",
      image: "images/in class standing.jpg",
      text:
        "Somewhere in SHS, a friendship began becoming " +
        "something unusually close. There are people " +
        "you meet, and then there are people who somehow " +
        "become part of your everyday world."
    },

    random: {
      icon: "📸",
      category: "MEMORY ARCHIVE",
      title: "The Class Days",
      image:
        "images/adgass group pic with Evelyn.jpg",
      text:
        "A few pictures from the days when we were all " +
        "together in class. Before the distance, before the " +
        "calls and messages, there were simply school days, " +
        "friends, laughter and moments worth remembering."
    },

    stories: {
      icon: "✍️",
      category: "MEMORY ARCHIVE",
      title: "The Stories We Made",
      image: "images/adgass group pic with Evelyn 2.jpg",
      text:
        "There were conversations, ideas, jokes and stories " +
        "that became part of the friendship. Some moments " +
        "were ordinary when they happened, but became " +
        "memories later."
    },

    missing: {
      icon: "🐻",
      category: "MISSING OBJECT",
      title: "The Teddy Called Isabella",
      image: "images/Isabella image real.jpg",
      text:
        "A red teddy with 'I love you' on the front. " +
        "She got a name. Isabella. Then one day she " +
        "disappeared somewhere in a car. " +
        "So the digital Isabella had to take over."
    }
  };

  function openMemory(id) {
    const memory = memories[id];

    if (!memory) {
      console.warn(
        "[Isabella OS] Unknown memory:",
        id
      );
      return;
    }

    if (!state.memoriesOpened.includes(id)) {
      state.memoriesOpened.push(id);
      saveState();
    }

    const modal = $("#memoryModal");
    const icon = $("#modalIcon");
    const category = $("#modalCategory");
    const title = $("#modalTitle");
    const image = $("#modalMemoryImage");
    const text = $("#modalText");
    const placeholder = $("#modalPlaceholder");

    if (icon) {
      icon.textContent = memory.icon;
    }

    if (category) {
      category.textContent = memory.category;
    }

    if (title) {
      title.textContent = memory.title;
    }

    if (text) {
      text.textContent = memory.text;
    }

    if (image) {
      image.style.display = "";
      image.src = memory.image || "";
      image.alt = memory.title;

      image.onerror = () => {
        image.style.display = "none";

        if (placeholder) {
          placeholder.hidden = false;
        }
      };

      image.onload = () => {
        image.style.display = "";

        if (placeholder) {
          placeholder.hidden = true;
        }
      };

      if (!memory.image) {
        image.style.display = "none";

        if (placeholder) {
          placeholder.hidden = false;
        }
      }
    }

    if (placeholder) {
      placeholder.hidden = Boolean(memory.image);
    }

    if (modal) {
      modal.classList.add("active");
      modal.setAttribute(
        "aria-hidden",
        "false"
      );
    }

    playSound("soft");

    updateGuide(
      `Memory opened: ${memory.title}.`
    );
  }

  function closeMemory() {
    const modal = $("#memoryModal");

    if (!modal) {
      return;
    }

    if (
      modal.contains(
        document.activeElement
      )
    ) {
      safeCall(() => {
        document.activeElement.blur();
      });
    }

    modal.classList.remove("active");
    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  /* =======================================================
     STORIES
     ======================================================= */

  const stories = {
    story1: {
      number: "FILE 01",
      icon: "🎓",
      category: "SHS CHAPTER",
      title: "The Beginning",
      text:
        "Every little world has an origin. " +
        "This one started in SHS. Evelyn joined Science 1 " +
        "from S5, and somewhere between classes, mornings, " +
        "walks home, conversations, jokes and everyday school " +
        "life, the friendship became unusually close."
    },

    story2: {
      number: "FILE 02",
      icon: "💭",
      category: "FRIENDSHIP ARCHIVE",
      title: "Somewhere Between Friends",
      text:
        "After SHS, the distance changed the routine. " +
        "Kumasi and Accra were no longer classrooms apart. " +
        "There were messages, calls, video calls and long " +
        "periods of simply staying in contact. The friendship " +
        "had moved beyond the school environment."
    },

    story3: {
      number: "FILE 03",
      icon: "📖",
      category: "CREATIVE ARCHIVE",
      title: "The Stories We Made",
      text:
        "There were times when we created romance stories " +
        "and fictional worlds together. Characters could " +
        "become anything and the plot could go anywhere. " +
        "Those stories became another part of the friendship."
    },

    story4: {
      number: "FILE 04",
      icon: "✨",
      category: "MEMORY ARCHIVE",
      title: "The Little Things",
      text:
        "The biggest memories are not always the loudest. " +
        "Sometimes they are waiting in the morning, sitting " +
        "together in class, walking home, sharing food, " +
        "teasing each other or simply having another normal day."
    },

    story5: {
      number: "FILE 05",
      icon: "🔒",
      category: "UNSPOKEN FILE",
      title: "The Unspoken File",
      text:
        "Some things are important without needing a dramatic " +
        "explanation. This file isn't here to reveal a secret. " +
        "It simply records that some friendships can carry " +
        "meaning even when life changes around them."
    },

    story6: {
      number: "FILE 06",
      icon: "🐻",
      category: "ISABELLA ARCHIVE",
      title: "The Teddy Called Isabella",
      text:
        "There was once a real Isabella. A red teddy with " +
        "'I love you' written on it. She was named Isabella, " +
        "then eventually got lost somewhere in a car. " +
        "The digital Isabella was created to keep the name alive."
    },

    story7: {
      number: "FILE 07",
      icon: "🌍",
      category: "DISTANCE FILE",
      title: "Distance Didn't Delete Anything",
      text:
        "Distance changed the routine after SHS, but it did " +
        "not automatically erase the memories. There were still " +
        "messages, calls, conversations and the certificate trip " +
        "to Kumasi that brought back some of the old surroundings."
    },

    story8: {
      number: "FILE 08",
      icon: "💻",
      category: "SYSTEM FILE",
      title: "Why This Little World Exists",
      text:
        "Because a normal birthday message felt too ordinary. " +
        "So Isabella OS was built instead. A small digital world " +
        "made from memories, stories, a missing teddy bear and " +
        "a birthday message. Welcome to your little world. " +
        "Hamza made it for you. Happy Birthday. 🐻❤️"
    }
  };

  function openStory(id) {
    const story = stories[id];

    if (!story) {
      console.warn(
        "[Isabella OS] Unknown story:",
        id
      );
      return;
    }

    if (!state.storiesOpened.includes(id)) {
      state.storiesOpened.push(id);
      saveState();
    }

    const modal = $("#storyModal");
    const number = $("#storyFileNumber");
    const icon = $("#storyIcon");
    const category = $("#storyCategory");
    const title = $("#storyTitle");
    const text = $("#storyText");

    if (number) {
      number.textContent = story.number;
    }

    if (icon) {
      icon.textContent = story.icon;
    }

    if (category) {
      category.textContent = story.category;
    }

    if (title) {
      title.textContent = story.title;
    }

    if (text) {
      text.textContent = story.text;
    }

    if (modal) {
      modal.classList.add("active");
      modal.setAttribute(
        "aria-hidden",
        "false"
      );
    }

    playSound("soft");

    updateGuide(
      `Story file opened: ${story.title}.`
    );
  }

  function closeStory() {
    const modal = $("#storyModal");

    if (!modal) {
      return;
    }

    if (
      modal.contains(
        document.activeElement
      )
    ) {
      safeCall(() => {
        document.activeElement.blur();
      });
    }

    modal.classList.remove("active");
    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  /* =======================================================
     ISABELLA ROOM
     ======================================================= */

  const roomObjects = {
    "memory-box": {
      icon: "📦",
      category: "MEMORY OBJECT",
      title: "The Memory Box",
      content:
        "A little box filled with memories that Isabella " +
        "doesn't want the system to forget.",
      isabella:
        "I keep important things in here. Just in case."
    },

    bed: {
      icon: "🛏️",
      category: "ROOM OBJECT",
      title: "Isabella's Bed",
      content:
        "Apparently even digital teddy bears need somewhere " +
        "to sleep after spending all day protecting birthday files.",
      isabella:
        "Shhh... I was not sleeping. I was performing background maintenance."
    },

    radio: {
      icon: "📻",
      category: "ISABELLA'S RADIO",
      title: "The Little Radio",
      content:
        "A tiny radio sitting quietly in Isabella's room. " +
        "It contains two songs saved for Evelyn.",
      isabella:
        "Oh... you found my radio. Pick a song. 🎵"
    },

    photo: {
      icon: "🖼️",
      category: "PHOTO ARCHIVE",
      title: "The Photo",
      content:
        "A photograph from the archive. Some memories are better " +
        "kept close than explained.",
      isabella:
        "Some memories are better kept close."
    },

    notebook: {
      icon: "📔",
      category: "ISABELLA NOTES",
      title: "Isabella's Notebook",
      content:
        "The notebook contains tiny system notes about Evelyn's birthday.",
      isabella:
        "I may have written down a few things. Don't read everything."
    },

    drawer: {
      icon: "🗄️",
      category: "LOCKED OBJECT",
      title: "The Locked Drawer",
      content:
        "The drawer is locked. Isabella clearly doesn't want " +
        "you opening this yet.",
      isabella:
        "Nope. Not yet. You haven't discovered enough."
    },

    missing: {
      icon: "🐻",
      category: "MISSING TEDDY FILE",
      title: "The Missing Teddy Incident",
      content:
        "CASE STATUS: Isabella — Original Version — Missing.\n\n" +
        "Last known location: somewhere inside a car.\n\n" +
        "Digital replacement: ACTIVE.",
      isabella:
        "We're still investigating. Very serious teddy business."
    }
  };

  const roomDialogue = [
    "Hi Evelyn. 🐻",
    "Welcome to my room.",
    "I keep the important things here.",
    "Some objects have stories.",
    "Some stories have secrets.",
    "And some secrets are just me being dramatic. 😭",
    "Go ahead. Look around.",
    "Just don't open the drawer yet.",
    "Actually... definitely don't open the drawer."
  ];

  function visitRoom() {
    state.roomVisits += 1;
    saveState();

    showScreen("room");

    updateRoomDialogue(
      "Welcome to my room, Evelyn. 🐻❤️"
    );

    updateGuide(
      "Isabella's room is full of things to discover."
    );

    checkRoomProgress();
  }

  function updateRoomDialogue(text) {
    const dialogueText = $("#dialogueText");

    if (dialogueText) {
      dialogueText.textContent = text;
    }
  }

  function nextRoomDialogue() {
    dialogueIndex =
      (dialogueIndex + 1) %
      roomDialogue.length;

    const text =
      roomDialogue[dialogueIndex];

    updateRoomDialogue(text);
    playSound("soft");
    speak(text, "teddy");
  }

  function openRoomObject(id) {
    const object = roomObjects[id];

    if (!object) {
      console.warn(
        "[Isabella OS] Unknown room object:",
        id
      );
      return;
    }

    if (id === "radio") {
      openRadio();

      registerRoomDiscovery(
        "radio",
        object.title
      );

      checkRoomProgress();

      return;
    }

    if (
      id === "drawer" &&
      !isDrawerUnlocked()
    ) {
      openLockedDrawer();
      return;
    }

    registerRoomDiscovery(
      id,
      object.title
    );

    const modal = $("#roomObjectModal");
    const icon = $("#roomObjectIcon");
    const category = $("#roomObjectCategory");
    const title = $("#roomObjectTitle");
    const content = $("#roomObjectContent");
    const isabellaText = $("#roomObjectIsabellaText");

    if (icon) {
      icon.textContent = object.icon;
    }

    if (category) {
      category.textContent = object.category;
    }

    if (title) {
      title.textContent = object.title;
    }

    if (content) {
      content.textContent = object.content;
    }

    if (isabellaText) {
      isabellaText.textContent = object.isabella;
    }

    if (modal) {
      modal.classList.add("active");
      modal.setAttribute(
        "aria-hidden",
        "false"
      );
    }

    playSound("pop");
    updateRoomDialogue(object.isabella);
    checkRoomProgress();
  }

  function registerRoomDiscovery(id, title) {
    if (
      state.roomDiscoveries.includes(id)
    ) {
      return false;
    }

    state.roomDiscoveries.push(id);
    saveState();

    showRoomDiscovery(title);

    return true;
  }

  function closeRoomObject() {
    const modal = $("#roomObjectModal");

    if (!modal) {
      return;
    }

    if (
      modal.contains(
        document.activeElement
      )
    ) {
      safeCall(() => {
        document.activeElement.blur();
      });
    }

    modal.classList.remove("active");

    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  function showRoomDiscovery(title) {
    const discovery = $("#roomDiscovery");
    const discoveryText = $("#roomDiscoveryText");

    if (!discovery) {
      return;
    }

    if (discoveryText) {
      discoveryText.textContent =
        `Discovered: ${title}`;
    }

    discovery.classList.add("show");
    discovery.classList.add("active");

    playSound("pop");

    setTimeout(() => {
      discovery.classList.remove("show");
      discovery.classList.remove("active");
    }, 2200);
  }

  function closeRoomDiscovery() {
    const discovery = $("#roomDiscovery");

    if (!discovery) {
      return;
    }

    discovery.classList.remove("show");
    discovery.classList.remove("active");
  }

  function isDrawerUnlocked() {
    return state.roomDiscoveries.length >= 5;
  }

  function openLockedDrawer() {
    const lockedDrawer = $("#lockedDrawer");

    if (lockedDrawer) {
      lockedDrawer.classList.add("active");

      setTimeout(() => {
        lockedDrawer.classList.remove("active");
      }, 1800);
    }

    updateRoomDialogue(
      "Not yet. Discover a few more things first. 👀"
    );

    speak(
      "Not yet. Discover a few more things first.",
      "playful"
    );

    playSound("soft");
  }

  function checkRoomProgress() {
    const discoveries =
      state.roomDiscoveries.length;

    const drawer =
      $(".drawer-object");

    if (discoveries >= 3) {
      updateRoomDialogue(
        "Hmm... you're getting closer."
      );
    }

    if (discoveries >= 5) {
      updateRoomDialogue(
        "Okay... maybe you've earned access to the drawer."
      );

      if (drawer) {
        drawer.classList.remove("locked");
        drawer.dataset.unlocked = "true";
      }
    }

    if (discoveries >= 6) {
      state.finalSecretFound = true;
      saveState();

      updateRoomDialogue(
        "You found almost everything. There is one final file."
      );
    }
  }

  function openRoomArchive() {
    showScreen("memories");

    updateGuide(
      "Back to the memory archive."
    );
  }

  function openRoomSecret() {
    if (
      state.roomDiscoveries.length < 4
    ) {
      updateRoomDialogue(
        "Nice try. There are still things you haven't found."
      );

      speak(
        "Nice try. There are still things you haven't found.",
        "playful"
      );

      playSound("soft");
      return;
    }

    state.secretFound = true;
    saveState();

    updateRoomDialogue(
      "Okay... you found the hidden room file. 🐻"
    );

    showToast(
      "Secret room file unlocked."
    );

    playSound("birthday");
  }

  /* =======================================================
     RADIO
     ======================================================= */

  function updateRadioNowPlaying(song) {
    const icon = $("#radioNowPlayingIcon");
    const title = $("#radioNowPlayingTitle");
    const artist = $("#radioNowPlayingArtist");

    if (icon) {
      icon.textContent = song.icon;
    }

    if (title) {
      title.textContent = song.title;
    }

    if (artist) {
      artist.textContent =
        `by ${song.artist}`;
    }

    $$(".radio-song").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.radioSong === song.id
      );
    });

    $$("[data-radio-song]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.radioSong === song.id
      );
    });
  }

  function openRadio() {
    const radio = $("#radioPlayer");

    if (!radio) {
      return;
    }

    radio.hidden = false;
    radio.classList.add("active");

    updateRadioNowPlaying(
      state.lastSong &&
      SONGS[state.lastSong]
        ? SONGS[state.lastSong]
        : SONGS.birthday
    );

    updateRoomDialogue(
      "Oh... you found my radio. Pick a song. 🎵"
    );

    playSound("pop");

    speak(
      "Oh... you found my radio. Pick a song.",
      "cute"
    );
  }

  function closeRadio() {
    const radio = $("#radioPlayer");

    if (!radio) {
      return;
    }

    if (
      radio.contains(
        document.activeElement
      )
    ) {
      safeCall(() => {
        document.activeElement.blur();
      });
    }

    radio.classList.remove("active");
    radio.hidden = true;
  }

  function playSunoSong(
    songId,
    source = "birthday"
  ) {
    const song = SONGS[songId];

    if (!song) {
      console.warn(
        "[Isabella OS] Unknown song:",
        songId
      );
      return;
    }

    state.lastSong = song.id;
    saveState();

    updateRadioNowPlaying(song);
    playSound("click");

    let speech =
      `Evelyn... this is ${song.title}. It's by Hamza.`;

    if (song.id === "birthday") {
      speech =
        "Evelyn... I made a little song for you. " +
        "Happy birthday. I hope you like it. 🐻❤️";
    }

    if (song.id === "story") {
      speech =
        "This one is called The Story We Remember. " +
        "A little song about the memories.";
    }

    speak(speech, "soft");

    setTimeout(() => {
      window.open(
        song.url,
        "_blank",
        "noopener,noreferrer"
      );
    }, 900);

    if (source === "radio") {
      updateRoomDialogue(
        `Opening: ${song.title}`
      );

      showToast(
        `Opening ${song.title}...`
      );
    }
  }

  function initializeRadio() {
    const radioClose = $("#radioClose");

    if (radioClose) {
      radioClose.addEventListener(
        "click",
        () => {
          playSound("click");
          closeRadio();
        }
      );
    }

    $$("[data-radio-song]").forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          playSunoSong(
            button.dataset.radioSong,
            "radio"
          );
        }
      );
    });

    const radio = $("#radioPlayer");

    if (radio) {
      radio.addEventListener(
        "click",
        event => {
          if (
            event.target === radio ||
            event.target.classList.contains(
              "modal-backdrop"
            )
          ) {
            closeRadio();
          }
        }
      );
    }
  }

  /* =======================================================
     BIRTHDAY
     ======================================================= */

  function isBirthdayUnlocked() {
    return state.birthdayUnlocked;
  }

  function unlockBirthday() {
    state.birthdayUnlocked = true;
    saveState();

    updateBirthdayScreen();

    playSound("birthday");

    speak(
      "Happy birthday, Evelyn. " +
      "This little world was made especially for you.",
      "excited"
    );

    createBirthdayEffects();

    showToast(
      "Birthday file unlocked. 🎂"
    );
  }

  function updateBirthdayScreen() {
    const lock = $("#birthdayLock");
    const final = $("#birthdayFinal");
    const unlockButton = $("#unlockBirthday");

    if (!lock || !final) {
      return;
    }

    if (isBirthdayUnlocked()) {
      lock.hidden = true;
      final.hidden = false;

      final.classList.add("revealed");

      if (unlockButton) {
        unlockButton.hidden = true;
      }

      updateWishButton();
      return;
    }

    lock.hidden = false;
    final.hidden = true;

    final.classList.remove("revealed");

    if (unlockButton) {
      unlockButton.hidden = false;
    }
  }

  function updateWishButton() {
    const button = $("#makeWishButton");

    if (!button) {
      return;
    }

    if (state.birthdayWished) {
      button.textContent = "Wish saved ✨";
      button.disabled = true;
    } else {
      button.textContent = "Make a wish ✨";
      button.disabled = false;
    }
  }

  function openBirthday() {
    showScreen("birthday");

    updateBirthdayScreen();
    updateWishButton();

    updateGuide(
      "Your birthday file is waiting. 🎂"
    );

    if (isBirthdayUnlocked()) {
      setTimeout(() => {
        speak(
          "Welcome to your birthday file, Evelyn.",
          "teddy"
        );
      }, 350);
    }
  }

  function makeWish() {
    if (!isBirthdayUnlocked()) {
      showToast(
        "Open the birthday file first. 🎂"
      );

      return;
    }

    if (state.birthdayWished) {
      return;
    }

    state.birthdayWished = true;
    saveState();

    playSound("birthday");

    updateWishButton();
    createBirthdayEffects();

    speak(
      "Wish saved. " +
      "I hope this year gives you many reasons to smile.",
      "soft"
    );

    showToast(
      "Your wish has been saved. ✨"
    );
  }

  function createBirthdayEffects() {
    const container = $("#birthdayScreen");

    if (!container) {
      return;
    }

    const symbols = [
      "❤️",
      "✨",
      "🎂",
      "🎈",
      "⭐",
      "🐻",
      "💗"
    ];

    for (let i = 0; i < 16; i++) {
      const item =
        document.createElement("span");

      item.className =
        "birthday-floating-symbol";

      item.textContent =
        symbols[
          Math.floor(
            Math.random() *
            symbols.length
          )
        ];

      item.style.left =
        `${Math.random() * 100}%`;

      item.style.animationDelay =
        `${Math.random() * 1.5}s`;

      item.style.animationDuration =
        `${3 + Math.random() * 3}s`;

      container.appendChild(item);

      setTimeout(() => {
        item.remove();
      }, 6500);
    }
  }

  /* =======================================================
     BIRTHDAY SONG EVENTS
     ======================================================= */

  function initializeBirthdaySongs() {
    const birthdayButton =
      $("#playBirthdaySong");

    const storyButton =
      $("#playStorySong");

    if (birthdayButton) {
      birthdayButton.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          playSunoSong(
            "birthday",
            "birthday"
          );
        }
      );
    }

    if (storyButton) {
      storyButton.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          playSunoSong(
            "story",
            "birthday"
          );
        }
      );
    }
  }

  /* =======================================================
     BIRTHDAY CLOCK
     ======================================================= */

  function initializeBirthdayClock() {
    if (birthdayClockTimer) {
      clearInterval(
        birthdayClockTimer
      );
    }

    const update = () => {
      const elements =
        $$("[data-birthday-countdown]");

      if (!elements.length) {
        return;
      }

      const now = new Date();

      let target =
        new Date(
          now.getFullYear(),
          CONFIG.birthdayMonth,
          CONFIG.birthdayDay,
          0,
          0,
          0
        );

      if (now >= target) {
        target =
          new Date(
            now.getFullYear() + 1,
            CONFIG.birthdayMonth,
            CONFIG.birthdayDay,
            0,
            0,
            0
          );
      }

      const difference =
        target.getTime() -
        now.getTime();

      const totalSeconds =
        Math.max(
          0,
          Math.floor(
            difference / 1000
          )
        );

      const days =
        Math.floor(
          totalSeconds / 86400
        );

      const hours =
        Math.floor(
          (totalSeconds % 86400) /
          3600
        );

      const minutes =
        Math.floor(
          (totalSeconds % 3600) /
          60
        );

      const seconds =
        totalSeconds % 60;

      elements.forEach(element => {
        element.textContent =
          `${days}d ` +
          `${String(hours).padStart(2, "0")}h ` +
          `${String(minutes).padStart(2, "0")}m ` +
          `${String(seconds).padStart(2, "0")}s`;
      });
    };

    update();

    birthdayClockTimer =
      setInterval(
        update,
        1000
      );
  }

  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(message) {
    const toast = $("#toast");
    const toastText = $("#toastText");

    if (!toast) {
      return;
    }

    if (toastText) {
      toastText.textContent = message;
    }

    toast.classList.add("active");

    clearTimeout(toastTimer);

    toastTimer =
      setTimeout(() => {
        toast.classList.remove("active");
      }, 2500);
  }

  /* =======================================================
     MODAL HELPERS
     ======================================================= */

  function closeAllModals() {
    closeMemory();
    closeStory();
    closeRoomObject();
    closeRoomDiscovery();
    closeRadio();

    const lockedDrawer = $("#lockedDrawer");

    if (lockedDrawer) {
      lockedDrawer.classList.remove("active");
    }
  }

  /* =======================================================
     NAVIGATION EVENTS
     ======================================================= */

  function initializeNavigation() {
    $$("[data-section]").forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const section =
            button.dataset.section;

          playSound("click");

          switch (section) {
            case "birthday":
              openBirthday();
              break;

            case "isabella":
              visitRoom();
              break;

            case "memories":
              showScreen("memories");

              updateGuide(
                "Let's open the memory archive."
              );
              break;

            case "stories":
              showScreen("stories");

              updateGuide(
                "The story files are ready."
              );
              break;

            case "home":
              showScreen("home");
              break;

            default:
              console.warn(
                "[Isabella OS] Unknown section:",
                section
              );
          }
        }
      );
    });

    const enterButton =
      $("#enterButton");

    if (enterButton) {
      enterButton.addEventListener(
        "click",
        enterSystem
      );
    }

    const memoriesBackButton =
      $("#memoriesBackButton");

    if (memoriesBackButton) {
      memoriesBackButton.addEventListener(
        "click",
        () => {
          playSound("click");
          showScreen("home");
        }
      );
    }

    const roomBackButton =
      $("#roomBackButton");

    if (roomBackButton) {
      roomBackButton.addEventListener(
        "click",
        () => {
          playSound("click");
          showScreen("home");
        }
      );
    }

    const storiesBackButton =
      $("#storiesBackButton");

    if (storiesBackButton) {
      storiesBackButton.addEventListener(
        "click",
        () => {
          playSound("click");
          showScreen("home");
        }
      );
    }

    const birthdayBackButton =
      $("#birthdayBackButton");

    if (birthdayBackButton) {
      birthdayBackButton.addEventListener(
        "click",
        () => {
          playSound("click");
          showScreen("home");
        }
      );
    }
  }

  /* =======================================================
     MEMORY EVENTS
     ======================================================= */

  function initializeMemoryEvents() {
    $$("[data-memory]").forEach(card => {
      card.addEventListener(
        "click",
        () => {
          playSound("click");

          openMemory(
            card.dataset.memory
          );
        }
      );
    });

    const closeButton =
      $("#modalClose");

    if (closeButton) {
      closeButton.addEventListener(
        "click",
        () => {
          playSound("click");
          closeMemory();
        }
      );
    }

    const modal =
      $("#memoryModal");

    if (modal) {
      modal.addEventListener(
        "click",
        event => {
          if (
            event.target === modal ||
            event.target.classList.contains(
              "modal-backdrop"
            )
          ) {
            closeMemory();
          }
        }
      );
    }
  }

  /* =======================================================
     STORY EVENTS
     ======================================================= */

  function initializeStoryEvents() {
    $$("[data-story]").forEach(card => {
      card.addEventListener(
        "click",
        () => {
          playSound("click");

          openStory(
            card.dataset.story
          );
        }
      );
    });

    const closeButton =
      $("#storyModalClose");

    if (closeButton) {
      closeButton.addEventListener(
        "click",
        () => {
          playSound("click");
          closeStory();
        }
      );
    }

    const modal =
      $("#storyModal");

    if (modal) {
      modal.addEventListener(
        "click",
        event => {
          if (
            event.target === modal ||
            event.target.classList.contains(
              "modal-backdrop"
            )
          ) {
            closeStory();
          }
        }
      );
    }
  }

  /* =======================================================
     ROOM EVENTS
     ======================================================= */

  function initializeRoomEvents() {
    $$("[data-room-object]").forEach(button => {
      button.addEventListener(
        "click",
        () => {
          playSound("click");

          openRoomObject(
            button.dataset.roomObject
          );
        }
      );
    });

    const roomBear =
      $("#roomBear");

    if (roomBear) {
      roomBear.addEventListener(
        "click",
        () => {
          playSound("soft");
          nextRoomDialogue();
        }
      );
    }

    const talkButton =
      $("#talkButton");

    if (talkButton) {
      talkButton.addEventListener(
        "click",
        () => {
          nextRoomDialogue();
        }
      );
    }

    const secretButton =
      $("#secretButton");

    if (secretButton) {
      secretButton.addEventListener(
        "click",
        () => {
          playSound("pop");
          openRoomSecret();
        }
      );
    }

    const roomSecretButton =
      $("#roomSecretButton");

    if (roomSecretButton) {
      roomSecretButton.addEventListener(
        "click",
        () => {
          playSound("pop");
          openRoomSecret();
        }
      );
    }

    const archiveButton =
      $("#roomArchiveButton");

    if (archiveButton) {
      archiveButton.addEventListener(
        "click",
        () => {
          playSound("click");
          openRoomArchive();
        }
      );
    }

    const closeButton =
      $("#roomObjectClose");

    if (closeButton) {
      closeButton.addEventListener(
        "click",
        () => {
          playSound("click");
          closeRoomObject();
        }
      );
    }

    const closeDiscovery =
      $("#roomDiscoveryClose");

    if (closeDiscovery) {
      closeDiscovery.addEventListener(
        "click",
        () => {
          playSound("click");
          closeRoomDiscovery();
        }
      );
    }

    const modal =
      $("#roomObjectModal");

    if (modal) {
      modal.addEventListener(
        "click",
        event => {
          if (
            event.target === modal ||
            event.target.classList.contains(
              "modal-backdrop"
            )
          ) {
            closeRoomObject();
          }
        }
      );
    }
  }

  /* =======================================================
     BIRTHDAY EVENTS
     ======================================================= */

  function initializeBirthdayEvents() {
    const unlockButton =
      $("#unlockBirthday");

    if (unlockButton) {
      unlockButton.addEventListener(
        "click",
        () => {
          playSound("click");
          unlockBirthday();
        }
      );
    }

    const wishButton =
      $("#makeWishButton");

    if (wishButton) {
      wishButton.addEventListener(
        "click",
        makeWish
      );
    }
  }

  /* =======================================================
     GENERAL BUTTON SOUND
     ======================================================= */

  function initializeButtonSounds() {
    $$("button").forEach(button => {
      if (
        button.dataset.soundInitialized ===
        "true"
      ) {
        return;
      }

      button.dataset.soundInitialized =
        "true";

      button.addEventListener(
        "pointerdown",
        () => {
          const custom =
            button.dataset.section ||
            button.dataset.memory ||
            button.dataset.story ||
            button.dataset.roomObject ||
            button.dataset.radioSong ||
            button.id === "enterButton" ||
            button.id === "unlockBirthday" ||
            button.id === "makeWishButton" ||
            button.id === "talkButton" ||
            button.id === "secretButton" ||
            button.id === "roomSecretButton" ||
            button.id === "roomArchiveButton" ||
            button.id === "playBirthdaySong" ||
            button.id === "playStorySong" ||
            button.id === "radioClose";

          if (custom) {
            return;
          }

          playSound("click");
        }
      );
    });
  }

  /* =======================================================
     KEYBOARD
     ======================================================= */

  function initializeKeyboard() {
    document.addEventListener(
      "keydown",
      event => {
        if (event.key === "Escape") {
          closeAllModals();
        }
      }
    );
  }

  /* =======================================================
     MOTION
     ======================================================= */

  function initializeMotion() {
    if (
      window.matchMedia &&
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      document.body.classList.add(
        "reduced-motion"
      );
    }
  }

  /* =======================================================
     IMAGE PRELOADING
     ======================================================= */

  function preloadImages() {
    const imageSources =
      $$("img")
        .map(image =>
          image.getAttribute("src")
        )
        .filter(Boolean);

    imageSources.forEach(src => {
      const image = new Image();
      image.src = src;
    });
  }

  /* =======================================================
     VISIBILITY
     ======================================================= */

  function initializeVisibility() {
    showScreen(
      "boot",
      {
        skipSave: true
      }
    );
  }

  /* =======================================================
     ERROR HANDLING
     ======================================================= */

  function initializeErrorHandling() {
    window.addEventListener(
      "error",
      event => {
        console.error(
          "[Isabella OS] Runtime error:",
          event.error ||
          event.message
        );

        if (
          currentScreen === "boot" &&
          !bootRunning
        ) {
          finishBoot();
        }
      }
    );

    window.addEventListener(
      "unhandledrejection",
      event => {
        console.error(
          "[Isabella OS] Promise error:",
          event.reason
        );

        if (
          currentScreen === "boot" &&
          !bootRunning
        ) {
          finishBoot();
        }
      }
    );
  }

  /* =======================================================
     RESET
     ======================================================= */

  function resetSystem() {
    try {
      localStorage.removeItem(
        CONFIG.storageKey
      );

      state = {
        ...DEFAULT_STATE
      };

      location.reload();
    } catch (error) {
      console.error(
        "[Isabella OS] Reset failed.",
        error
      );
    }
  }

  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.IsabellaOS = {
    reset: resetSystem,
    state: () => ({ ...state }),
    showScreen,
    speak,
    playSound,
    openRadio,
    playSong: playSunoSong
  };

  /* =======================================================
     INITIALIZATION
     ======================================================= */

  async function init() {
    if (initialized) {
      return;
    }

    initialized = true;

    console.log(
      "[Isabella OS] Initializing..."
    );

    try {
      const missingScreens =
        Object.entries(screens)
          .filter(([, element]) => !element)
          .map(([name]) => name);

      if (missingScreens.length) {
        console.warn(
          "[Isabella OS] Missing screens:",
          missingScreens
        );
      }

      initializeErrorHandling();
      initializeAudio();
      initializeMotion();
      initializeVisibility();
      initializeIntro();
      initializeNavigation();
      initializeMemoryEvents();
      initializeStoryEvents();
      initializeRoomEvents();
      initializeRadio();
      initializeBirthdayEvents();
      initializeBirthdaySongs();
      initializeButtonSounds();
      initializeKeyboard();
      initializeBirthdayClock();
      preloadImages();
      updateBirthdayInterface();
      updateBirthdayScreen();
      updateWishButton();
      checkRoomProgress();

      showScreen(
        "boot",
        {
          skipSave: true
        }
      );

      updateBootUI(
        0,
        "Starting Isabella Operating System..."
      );

      await delay(250);

      runBootSequence();

      console.log(
        "[Isabella OS] Initialization complete."
      );
    } catch (error) {
      console.error(
        "[Isabella OS] Initialization failed:",
        error
      );

      finishBoot();
    }
  }

  /* =======================================================
     DOM READY
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }
})();