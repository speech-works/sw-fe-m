/**
 * DEV ONLY (preview harness): real content of the program "Dating, Intimacy & Vulnerability", Days 1 and 2, copied from
 * the backend seed (sw-be-2/src/seed/pack/new_packs_2.ts + question/programQuiz.ts + form/index.ts) and shaped like
 * the API answer (api/packs/types.ts). Made by running the seed through the backend's own form and override code.
 * Day 2 shows one recall question ("From yesterday"), as the server does. Video has no file: the player shows its empty state.
 */
export const DATING_RAW: any = {
 "pack": {
  "title": "Dating, Intimacy & Vulnerability",
  "description": "Seven short days on dating with a stutter. You choose your own words for the moments that worry you, and practise them on your own.",
  "arcDays": 7
 },
 "modules": [
  {
   "id": "mod-d1",
   "title": "Day 1: When you cannot plan what to say",
   "description": "Why you cannot plan a date like an interview. Then you write down one piece of advice you were given.",
   "estimatedDurationMin": 14,
   "isMandatory": true,
   "orderIndex": 1,
   "dayIndex": 1,
   "blocks": [
    {
     "id": "d1b1",
     "type": "VIDEO",
     "orderIndex": 1,
     "content": {
      "provider": "BUNNY",
      "videoId": "b6c94cdb-f70d-450d-b0c3-4bae767ef538",
      "durationSeconds": 109
     }
    },
    {
     "id": "d1b2",
     "type": "TEXT",
     "orderIndex": 2,
     "content": {
      "role": "bridge_in",
      "markdown": "Welcome to the first of seven short days. Each day, you read a short lesson and do one short practice on your own. Some practices are written. On some days, you also say a few words out loud. You decide if and when you use any of it on a date.\n\nToday is about why you cannot plan a date the way you plan an interview, and about the advice people give. Then you write down one piece of advice you were given."
     }
    },
    {
     "id": "d1b3",
     "type": "TEXT",
     "orderIndex": 3,
     "content": {
      "role": "teach",
      "markdown": "## Why you cannot plan a date like an interview\n\nThink of a job interview. You can guess many of the questions. You know your role, and it is fine to be a bit formal. So you can prepare. With the right preparation, the first question can even feel familiar. Speechworks has a program for this too, called Interview Ready. It helps you walk in already knowing your answers to the questions you fear most.\n\nA date is different. There is no list of questions, no role and no script. You talk as yourself, while the other person decides if they like you. This may be one reason why some people delay dating.\n\nAvoiding a date can also mean missing a chance. If you skip a work meeting, there is usually another chance to speak next week. If you never answer a message from someone you like, that chance may not come back. So this week helps you prepare the parts you can. For example, the words you may want, and what to do in moments that worry you.\n\n### The idea that your stutter is a filter\n\nYou may have heard this idea: your stutter is a filter. Anyone who minds it is not worth your time. This program does not use that idea, for two reasons:\n\n- **Awkward is different from unkind.** People can be awkward when they meet something new. Many people who are awkward for the first thirty seconds are worth knowing.\n- **The idea can make you feel wrong for being hurt.** It says your stutter is a good thing, because it shows you who is not worth your time. So if a date goes badly and it hurts, you may feel you are not allowed to be hurt.\n\nDating with a stutter can be difficult, and you can say so. This week gives you small steps to prepare for it.\n\n### Four things about this week\n\n- **You practise in your own time, at your own pace.** Each practice is something you write, think about or say alone. You do not need a date for any practice. Use what you learn on a date only when you want to.\n- **You can skip any practice.** If you skip something, we note it as your choice. You can come back to it at any time.\n- **What you write is yours.** It is private. Only you can see it.\n- **Help is there if you need it.** If you are ever in crisis, call your local emergency number. The Stuttering support page in Settings shows a free, confidential helpline for your country, or a link to find one. It is there on any day of this program and long after it ends. Using it does not mean you failed to manage on your own."
     }
    },
    {
     "id": "d1b4",
     "type": "TEXT",
     "orderIndex": 4,
     "content": {
      "role": "teach",
      "markdown": "## The advice people give you\n\nPeople who stutter may get a lot of advice about dating. Some of it comes from people who love you. Some comes from people who did not know what else to say. You may have heard some of these lines:\n\n- Slow down.\n- Just relax.\n- Think about what you want to say first.\n- Do not mention it, you will only draw attention to it.\n- Definitely mention it, get it out of the way.\n- Be confident, people find confidence attractive.\n\nSome of these lines say the opposite of each other. \"Do not mention it\" and \"Definitely mention it\" cannot both be right. Still, people often say each one as if it were obvious.\n\nMost people who give advice like this mean well. They are guessing what might help you. But a piece of advice can guide what you do for years, even if you never chose it. So it helps to look at one piece of advice and ask yourself: did I ever agree with this?\n\n### Today's practice\n\nAfter the quiz, you pick one piece of advice. It can be from the list above, or advice you heard somewhere else. If nobody has given you dating advice, pick the line from the list that sounds most like what you tell yourself. Then you write four short things about it:\n\n1. The words, as the person said them.\n2. Who said it.\n3. Whether you ever agreed with it.\n4. What following it took from you, if anything. For example, time, effort or a chance you missed.\n\nFor example:\n\n- **The words:** \"Tell them straight away.\"\n- **Who said it:** A friend.\n- **Did I agree?** No. I was not ready.\n- **What following it took:** I still followed it. All evening, I waited for a good moment to tell them I stutter.\n\nWhen it is written down, you can decide what to do with the advice. You can keep it, change it, or leave it behind."
     }
    },
    {
     "id": "d1b5",
     "type": "QUIZ",
     "orderIndex": 5,
     "content": {
      "mode": "check",
      "questionKeys": [],
      "questions": [
       {
        "id": "q-di_d1_c1",
        "text": "Why is it more difficult to prepare for a date than for an interview?",
        "options": [
         {
          "text": "It matters more than most conversations.",
          "value": 1,
          "explanation": "Sometimes it does, and sometimes an interview matters more. Either way, how much it matters does not give you questions to prepare for.",
          "isCorrect": false
         },
         {
          "text": "There is no list of questions, no role and no script.",
          "value": 2,
          "explanation": "In an interview, you can guess many of the questions, and you have a role. On a date, you talk as yourself. So this week helps you prepare the parts you can, like the words you may want.",
          "isCorrect": true
         },
         {
          "text": "People are less kind in that setting.",
          "value": 3,
          "explanation": "Day 1 does not say people are less kind on a date. The difference is that a date has no set questions and no role.",
          "isCorrect": false
         }
        ]
       },
       {
        "id": "q-di_d1_c2",
        "text": "Why does this program not use the idea that your stutter is a filter?",
        "options": [
         {
          "text": "Because nobody really minds a stutter on a first date.",
          "value": 1,
          "explanation": "Day 1 does not say that. Some people may handle a stutter badly. The reasons day 1 gives are about awkward people, and about how the idea can make you feel.",
          "isCorrect": false
         },
         {
          "text": "Because awkward people can still be worth knowing.",
          "value": 2,
          "explanation": "Many people are awkward when they meet something new, and then they are fine. Day 1 gives a second reason too. The idea says your stutter is a good thing, because it shows you who is not worth your time. So if a date goes badly and it hurts, you may feel you are not allowed to be hurt.",
          "isCorrect": true
         },
         {
          "text": "Because it makes dating with a stutter sound too easy.",
          "value": 3,
          "explanation": "Day 1 gives two other reasons. Awkward is different from unkind. And the idea can make you feel wrong for being hurt if a date goes badly.",
          "isCorrect": false
         }
        ]
       },
       {
        "id": "q-di_d1_c3",
        "text": "Why can avoiding a date mean you miss more than avoiding a work meeting?",
        "options": [
         {
          "text": "Because the other person remembers it for longer.",
          "value": 1,
          "explanation": "Day 1 does not talk about what the other person remembers. It says that a chance with someone you like may not come back.",
          "isCorrect": false
         },
         {
          "text": "Because it happens more often than avoiding at work.",
          "value": 2,
          "explanation": "Day 1 does not say it happens more often. It says that a missed chance on a date may not come back.",
          "isCorrect": false
         },
         {
          "text": "Because a work meeting comes again, and a missed chance may not.",
          "value": 3,
          "explanation": "If you skip a work meeting, there is usually another chance to speak next week. If you never answer a message from someone you like, that chance may not come back.",
          "isCorrect": true
         }
        ]
       }
      ]
     }
    },
    {
     "id": "d1b6",
     "type": "ACTIVITY",
     "orderIndex": 6,
     "content": {
      "refId": "90000000-0000-4000-8000-000000000040",
      "activityType": "EXPOSURE_PRACTICE",
      "estimatedMinutes": 3,
      "titleOverride": "Advice you never agreed to",
      "descriptionOverride": "Pick one piece of advice you were given. Write its words, who said it, whether you ever agreed with it, and what following it took from you.",
      "instructionsOverride": "Pick one line from the list of advice you just read, or advice you heard somewhere else. If nobody has given you dating advice, pick the line from the list that sounds most like what you tell yourself. In your notes after this practice, write four short things:\n\n1. The words, as the person said them.\n2. Who said it.\n3. Whether you ever agreed with it.\n4. What following it took from you, if anything.\n\nOne line is enough for each.",
      "encouragementOverride": "Any answer is fine. Today you only look at the advice. Later, you decide what to keep.",
      "completionPromptOverride": "",
      "configuration": {}
     }
    },
    {
     "id": "d1b7",
     "type": "FORM",
     "orderIndex": 7,
     "content": {
      "refId": "activity.date_note",
      "formId": "form-activity.date_note",
      "titleOverride": "Your notes on the advice",
      "configuration": {
       "formKey": "activity.date_note",
       "title": "Three short questions about today. A few words for each is enough.",
       "description": "",
       "fields": [
        {
         "id": "date_note.noticed",
         "label": "Which advice did you pick, and who said it? Did you ever agree with it, and what did following it take from you?",
         "required": false,
         "type": "TEXT_INPUT",
         "placeholder": "e.g., \"Just relax.\" My aunt said it. I never agreed. Trying to relax made me tense all evening."
        },
        {
         "id": "date_note.decided",
         "label": "Did you decide anything about this advice? \"Nothing yet\" is a fine answer.",
         "required": false,
         "type": "TEXT_INPUT",
         "placeholder": "e.g., Nothing yet."
        },
        {
         "id": "date_note.next_time",
         "label": "What would you like to do the next time someone gives you advice like this?",
         "required": false,
         "type": "TEXT_INPUT",
         "placeholder": "e.g., Say thank you, and then decide for myself."
        }
       ]
      }
     }
    },
    {
     "id": "d1b8",
     "type": "FORM",
     "orderIndex": 8,
     "content": {
      "refId": "activity.program_willingness",
      "formId": "form-activity.program_willingness",
      "titleOverride": "One number, before the week starts",
      "descriptionOverride": "How willing you are to say the things on your list when you meet someone new. Day 7 asks the same question again.",
      "configuration": {
       "formKey": "activity.program_willingness",
       "title": "One number, asked twice, so the last day has something to compare.",
       "description": "",
       "fields": [
        {
         "id": "program_willingness.willingness",
         "label": "Right now, how willing are you to say the things on your list (say my name on a phone call, ask one question in a meeting) when you meet someone new, even if the moment goes badly?",
         "description": "Willing, not calm. This is not a question about how you feel.",
         "required": true,
         "type": "SLIDER",
         "min": 0,
         "max": 10,
         "minLabel": "Not willing",
         "maxLabel": "Willing"
        },
        {
         "id": "program_willingness.note",
         "label": "Anything you want to add about your answer?",
         "required": false,
         "type": "TEXT_INPUT"
        }
       ]
      }
     }
    },
    {
     "id": "d1b9",
     "type": "TEXT",
     "orderIndex": 9,
     "content": {
      "role": "bridge_out",
      "markdown": "Today was about advice you were given, and whether you ever agreed with it.\n\nTomorrow is about a question many people have an opinion on: should you mention your stutter on a date? You read what studies found. Then you look at six good moments to mention your stutter, if you want to."
     }
    }
   ]
  },
  {
   "id": "mod-d2",
   "title": "Day 2: Whether to mention your stutter",
   "description": "What studies found about mentioning a stutter, and six moments where you could say it.",
   "estimatedDurationMin": 10,
   "isMandatory": true,
   "orderIndex": 2,
   "dayIndex": 2,
   "blocks": [
    {
     "id": "d2b1",
     "type": "TEXT",
     "orderIndex": 1,
     "content": {
      "role": "bridge_in",
      "markdown": "Yesterday was about advice you were given. You also chose a number for how willing you are to say the things on your list to someone new. Day 7 asks the same question again.\n\nToday is about whether to mention your stutter on a date. You read what studies found. Then you look at six good moments to mention your stutter, if you want to."
     }
    },
    {
     "id": "d2b2",
     "type": "QUIZ",
     "orderIndex": 2,
     "content": {
      "mode": "recall",
      "questionKeys": [],
      "questions": [
       {
        "id": "q-di_d1_r1",
        "text": "What makes a date different from an interview, according to day 1?",
        "options": [
         {
          "text": "You care more about the outcome.",
          "value": 1,
          "explanation": "Sometimes you do, and sometimes an interview matters more. But caring more does not give you questions to prepare for.",
          "isCorrect": false
         },
         {
          "text": "It goes on for longer than an interview does.",
          "value": 2,
          "explanation": "A long interview still has questions you can guess. The difference is that a date has no set questions and no role.",
          "isCorrect": false
         },
         {
          "text": "No list of questions and no role.",
          "value": 3,
          "explanation": "In an interview, you can guess many of the questions, and you have a role. On a date, you talk as yourself.",
          "isCorrect": true
         }
        ]
       }
      ]
     }
    },
    {
     "id": "d2b3",
     "type": "TEXT",
     "orderIndex": 3,
     "content": {
      "sources": [
       "DISCLOSURE_OVERALL",
       "DISCLOSURE_INFORMATIVE_WORDING",
       "DISCLOSURE_SPEAKER_SIDE",
       "DISCLOSURE_IN_CONVERSATION",
       "CONCEALMENT_EXPERIENCES"
      ],
      "role": "teach",
      "markdown": "## What studies found about mentioning it\n\nYou may have been told: mention your stutter early, and people will respond better. Researchers have looked at this from two sides: the listener and the speaker.\n\n**Coalson and colleagues (2026)** reviewed 18 studies about telling people you stutter. Some looked at how listeners rated the speaker. Others looked at how the speakers felt. 15 of the 18 studies found that telling had a good effect.\n\n### What listeners think\n\nIn most listener studies, people watch or hear a recording of a speaker who stutters. Sometimes the speaker mentions the stutter, and sometimes not. Then the listeners rate the speaker.\n\n**Byrd and colleagues (2017)** asked 338 adults to watch one video online. It showed a speaker who stutters at the start of a job interview. First, the speaker said one of three things:\n\n- an informative line: that they stutter, and what the listener may hear\n- an apologetic line: that they stutter, and a request to be patient with them\n- nothing about the stutter\n\nThen each person rated the speaker on ten things, such as how friendly the speaker seemed. Compared with saying nothing, the informative line got better ratings on six of the ten things. The apologetic line got a better rating on one. The differences were small to medium.\n\nSo a short line that gives information may help a listener see you more positively. These studies used job interviews and readings. They still tell you something useful for a date: if you mention your stutter, a short line that gives information may work better than an apology.\n\n### What speakers say\n\n**Gerlach-Houck and Cage (2025)** talked with 30 adults who stutter about hiding their stutter. Hiding can mean swapping words, watching for the moment your stutter shows, or avoiding saying your own name. Most of what people described was painful, such as shame and feeling cut off from others.\n\n**Young and colleagues (2023)** asked 156 adults who stutter about telling people. 97 in every 100 said telling had been useful in some part of their life. Some named feeling closer to people.\n\n**Mancinelli (2019)** asked 25 adults who stutter to have two conversations each. In one, they mentioned their stutter. In the other, they did not. They said both conversations took about the same effort, and made them about as nervous.\n\nSo if hiding your stutter is difficult for you, telling someone may help. And in the study by Mancinelli, both choices felt about the same. So you can pick whichever feels right for you on the night.\n\n### A question to ask yourself\n\nWhether you tell someone is your choice. A useful question is: \"Tonight, do I want them to know?\" Only you can answer it. Your answer can change from one evening to the next."
     }
    },
    {
     "id": "d2b4",
     "type": "TEXT",
     "orderIndex": 4,
     "content": {
      "sources": [
       "DISCLOSURE_TIMING",
       "TOLD_BEFORE_FIRST_DATE",
       "MARRIAGE_STORY_CHENNAI"
      ],
      "role": "teach",
      "markdown": "## Where a sentence about your stutter could go\n\nIf you want to mention your stutter, you can do it at many different moments. But some moments may feel easier than others. It helps to know them before a date. Here are six:\n\n- **In your profile, or in messages before you meet.** This includes a marriage profile. You decide before you meet, so you are not deciding while nervous. Then, when you meet, they already know, and you do not have to find a moment to say it.\n- **Through family or a go-between** (a person who introduces you), if that is how you meet people. You still decide what they say about you.\n- **Early, when you meet.** Some people say a short line near the start. Then they do not spend the evening looking for the right moment.\n- **When it comes up.** For example, you block on a word, or they notice your stutter. You say one short sentence about your stutter, and keep talking. Day 3 helps you write that sentence.\n- **Later, once you trust them.** You get to know them first. On the first few dates, you may not mention your stutter yet.\n- **Not at all.** This is a real choice too. Day 3 says more about it.\n\n:::story\n**Will Torr** met a woman on a dating app. Before their first date, he told her that he stammers. He mentioned it when he said he was going to his monthly stammering support group. She did not seem bothered. Will writes that, because she already knew, it took some of the pressure off the first date. He stammered a lot, and the date still went well. They have now had four dates. [Read Will's story on STAMMA](https://stamma.org/your-voice/dating-can-be-scary)\n:::\n\n:::story\n**Vidya Lalgudi Jaishankar**, from Chennai, used a marriage website. She told the first man about her stammer at the end of their first phone call. He did not call again. Later, she spoke with another man on the phone many times, and she did not mention it. She wanted him to know her as a person first. She writes, \"I knew I am more than my stammer.\" He and his family visited her home. Later, they all went out for lunch, and the couple sat at their own table. There, she told him. He stayed calm, and they kept talking about their lives. They married some months later. [Read Vidya's story on STAMMA](https://stamma.org/node/1215)\n:::takeaway\nWill told his match before they met. Vidya told her future husband face to face, at a family lunch. They chose different moments from the list above. You can choose your own moment, and you can choose a different one with each person.\n:::\n\nTwo small studies looked at the best time to mention it in a conversation. **Healey and colleagues (2007)** played recordings of a speaker who stutters to 90 listeners. In one version, the speaker mentioned the stutter at the start. In another, at the end. **Hebl and Skorinko (2005)** did a similar study about a different condition. In both studies, saying it near the start got a better response than saying it at the end. So if you are unsure, near the start may be a good place to begin. Any of the six moments above can still be the right one for you.\n\nThink back over the six moments. One may feel possible. Another may make you tense. That feeling tells you more about your choice than any rule."
     }
    },
    {
     "id": "d2b5",
     "type": "QUIZ",
     "orderIndex": 5,
     "content": {
      "mode": "check",
      "questionKeys": [],
      "questions": [
       {
        "id": "q-di_d2_c1",
        "text": "Byrd and colleagues (2017) asked 338 adults to rate a speaker who stutters. What did the informative line do, compared with saying nothing?",
        "options": [
         {
          "text": "It got better ratings on all ten things.",
          "value": 1,
          "explanation": "Six of the ten ratings were better. The other four did not change.",
          "isCorrect": false
         },
         {
          "text": "It made listeners less comfortable.",
          "value": 2,
          "explanation": "The study did not find that. Compared with saying nothing, the informative line got better ratings on six of the ten things.",
          "isCorrect": false
         },
         {
          "text": "It got better ratings on six of ten.",
          "value": 3,
          "explanation": "The informative line did better than the apology, which was better on only one thing. So a short line that gives information may help a listener see you more positively.",
          "isCorrect": true
         }
        ]
       },
       {
        "id": "q-di_d2_c2",
        "text": "Young and colleagues (2023) asked 156 adults who stutter about telling people. What did most of them say?",
        "options": [
         {
          "text": "It had made meeting new people more difficult for them.",
          "value": 1,
          "explanation": "Most of them said the opposite. 97 in every 100 said telling had been useful in some part of their life.",
          "isCorrect": false
         },
         {
          "text": "It had made no real difference in their life.",
          "value": 2,
          "explanation": "97 in every 100 said telling had been useful in some part of their life. Some named feeling closer to people.",
          "isCorrect": false
         },
         {
          "text": "It had been useful somewhere in their life.",
          "value": 3,
          "explanation": "97 in every 100 said this, and some named feeling closer to people.",
          "isCorrect": true
         }
        ]
       },
       {
        "id": "q-di_d2_c3",
        "text": "When you decide whether to tell someone, what is a useful question to ask yourself?",
        "options": [
         {
          "text": "\"Will it work on them?\"",
          "value": 1,
          "explanation": "The listener studies favour saying it. But they used recordings, mostly of job interviews or readings. One person on a date may react differently.",
          "isCorrect": false
         },
         {
          "text": "\"Tonight, do I want them to know?\"",
          "value": 2,
          "explanation": "Only you can answer it. Your answer can change from one evening to the next.",
          "isCorrect": true
         },
         {
          "text": "\"Is this the one right moment to say it?\"",
          "value": 3,
          "explanation": "Day 2 says there is no single right moment. It lists six moments, in no special order.",
          "isCorrect": false
         }
        ]
       }
      ]
     }
    },
    {
     "id": "d2b6",
     "type": "ACTIVITY",
     "orderIndex": 6,
     "content": {
      "refId": "90000000-0000-4000-8000-000000000007",
      "activityType": "EXPOSURE_PRACTICE",
      "estimatedMinutes": 2,
      "titleOverride": "Picture your moment",
      "descriptionOverride": "Pick one of the six moments from today and picture it. You do not need any words yet. \"Not at all\" is a fine answer too.",
      "instructionsOverride": "Pick one of the six moments from today's lesson, the one you would most likely use. Picture it in your head:\n\n- Where are you?\n- What has just been said?\n- What happens in the ten seconds after you say your sentence?\n\nYou do not need any words today. If you chose \"Not at all\", that is a fine answer, and you can finish here.",
      "encouragementOverride": "Today is only about when you might mention your stutter. Tomorrow you write the words.",
      "completionPromptOverride": "Which moment would you use, if any? Why that one?",
      "configuration": {}
     }
    },
    {
     "id": "d2b7",
     "type": "FORM",
     "orderIndex": 7,
     "content": {
      "refId": "activity.date_note",
      "formId": "form-activity.date_note",
      "titleOverride": "Your notes on the six moments",
      "configuration": {
       "formKey": "activity.date_note",
       "title": "Three short questions about today. A few words for each is enough.",
       "description": "",
       "fields": [
        {
         "id": "date_note.noticed",
         "label": "How did the six moments feel to you?",
         "required": false,
         "type": "TEXT_INPUT",
         "placeholder": "e.g., One of the moments made me tense. Another felt possible."
        },
        {
         "id": "date_note.decided",
         "label": "Did you choose a moment? \"Not yet\" and \"not at all\" are fine answers.",
         "required": false,
         "type": "TEXT_INPUT",
         "placeholder": "e.g., Not yet. \"Not at all\" is still possible."
        },
        {
         "id": "date_note.next_time",
         "label": "What would you like to have ready for that moment, if anything?",
         "required": false,
         "type": "TEXT_INPUT",
         "placeholder": "e.g., Words that sound like me, or no words at all."
        }
       ]
      }
     }
    },
    {
     "id": "d2b8",
     "type": "TEXT",
     "orderIndex": 8,
     "content": {
      "role": "bridge_out",
      "markdown": "Today was about six moments where you could mention your stutter. Picking one, or deciding none fits you, are both fine answers.\n\nTomorrow you can write a short sentence about your stutter, if you want one. First, you decide if you want to tell anyone at all. Then you can say your sentence out loud."
     }
    }
   ]
  }
 ],
 "allModules": [
  {
   "title": "Day 1: When you cannot plan what to say",
   "description": "Why you cannot plan a date like an interview. Then you write down one piece of advice you were given.",
   "orderIndex": 1,
   "dayIndex": 1,
   "isMandatory": true,
   "estimatedDurationMin": 14
  },
  {
   "title": "Day 2: Whether to mention your stutter",
   "description": "What studies found about mentioning a stutter, and six moments where you could say it.",
   "orderIndex": 2,
   "dayIndex": 2,
   "isMandatory": true,
   "estimatedDurationMin": 10
  },
  {
   "title": "Day 3: Say it your way, or not at all",
   "description": "You write one short sentence about your stutter, to tell someone or to reply if they notice.",
   "orderIndex": 3,
   "dayIndex": 3,
   "isMandatory": true,
   "estimatedDurationMin": 12
  },
  {
   "title": "Day 4: The rejection you are picturing",
   "description": "What studies show about rejection on a date. Then you notice times you avoided a chance with someone.",
   "orderIndex": 4,
   "dayIndex": 4,
   "isMandatory": true,
   "estimatedDurationMin": 12
  },
  {
   "title": "Day 5: What you think they are thinking",
   "description": "You learn to tell what your date did from what you guessed it meant.",
   "orderIndex": 5,
   "dayIndex": 5,
   "isMandatory": true,
   "estimatedDurationMin": 12
  },
  {
   "title": "Day 6: When they finish it for you",
   "description": "Short replies for when someone finishes your sentence. Then you practise one, so it is ready.",
   "orderIndex": 6,
   "dayIndex": 6,
   "isMandatory": true,
   "estimatedDurationMin": 16
  },
  {
   "title": "Day 7: Past the first date",
   "description": "What a partner may need to know. Make your own plan, at your own pace.",
   "orderIndex": 7,
   "dayIndex": 7,
   "isMandatory": true,
   "estimatedDurationMin": 17
  }
 ]
};
