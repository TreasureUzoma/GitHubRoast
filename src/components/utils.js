// utils.js

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/9.1.3/firebase-firestore.js";

const API_KEY = process.env.API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fetch GitHub Profile
export async function fetchGitHubProfile(username) {
    const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`
        }
    });
    if (!response.ok) {
        throw new Error(`GitHub profile fetch failed with status ${response.status}`);
    }
    return response.json();
}

export async function fetchGitHubRepos(username) {
    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`
        }
    });
    if (!response.ok) {
        throw new Error(`GitHub repos fetch failed with status ${response.status}`);
    }
    return response.json();
}

export async function fetchTotalContributions(username) {
    const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;
    const variables = { login: username };
    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `bearer ${GITHUB_TOKEN}`
        },
        body: JSON.stringify({ query, variables })
    });
    if (!response.ok) {
        throw new Error(`GitHub GraphQL API request failed with status ${response.status}`);
    }
    const responseData = await response.json();
    if (responseData.errors) {
        console.error("GraphQL Errors:", responseData.errors);
        throw new Error("Error fetching contributions via GraphQL API");
    }
    return responseData.data.user
        ? responseData.data.user.contributionsCollection.contributionCalendar.totalContributions
        : 0;
}

export async function fetchReadme(username) {
    const response = await fetch(`https://api.github.com/repos/${username}/${username}/contents/README.md`, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`
        }
    });
    if (response.ok) {
        const data = await response.json();
        return atob(data.content);
    }
    return "No README found.";
}

export function getMostUsedLanguage(repos) {
    const languageCounts = {};
    repos.forEach(repo => {
        const language = repo.language;
        if (language) {
            languageCounts[language] = (languageCounts[language] || 0) + 1;
        }
    });
    return Object.keys(languageCounts).reduce(
        (a, b) => (languageCounts[a] > languageCounts[b] ? a : b),
        null
    );
}

export async function generateRoast(profile, repos, totalContributions, totalStars, readme, mostUsedLanguage) {
    const prompt = `
You’re an AI for roasting profiles , users can only input their usernames, for security and privacy (fun and all authenticated)
Roast the following GitHub profile:
Username: ${profile.login}
Bio: ${profile.bio || "N/A"}
Total Contributions: ${totalContributions}
Total Public Repositories: ${profile.public_repos}
Total Private Repositories: ${profile.private_repos}
Total Stars: ${totalStars}
Most Used Language: ${mostUsedLanguage || "N/A"}
Followers: ${profile.followers}
Following: ${profile.following}
Company: ${profile.company || "N/A"}
Location: ${profile.location || "N/A"}
Blog: ${profile.blog || "N/A"}
Twitter: ${profile.twitter_username || "N/A"}
GitHub Profile: ${profile.html_url}
README: ${readme}
Make it something that’ll surely make the user cry. This is a project. Max of 80 words in reply. Make it personal. Make the person also laugh but 1000000% painful.
100% roasting 
Don't act nice 
Very wicked text. Show no respect. You're a roast king
for fun tho
  `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

export async function updateRoastCount() {
    const roastCountRef = doc(db, "stats", "totalRoasts");
    const roastCountSnap = await getDoc(roastCountRef);
    if (roastCountSnap.exists()) {
        await updateDoc(roastCountRef, { count: roastCountSnap.data().count + 1 });
    } else {
        await setDoc(roastCountRef, { count: 1 });
    }
}
