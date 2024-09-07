import React, { useState } from 'react';
import { fetchGitHubProfile, fetchGitHubRepos, fetchTotalContributions, fetchReadme, getMostUsedLanguage, generateRoast, updateRoastCount } from './utils';

function MainContent() {
  const [username, setUsername] = useState('');
  const [profileResult, setProfileResult] = useState('');
  const [profileData, setProfileData] = useState(null);  // New state for user profile data
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Trim extra spaces in the username
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      alert("Please enter a valid GitHub username.");
      return;
    }

    setLoading(true);
    try {
      const profile = await fetchGitHubProfile(trimmedUsername);
      const totalContributions = await fetchTotalContributions(trimmedUsername);
      const readme = await fetchReadme(trimmedUsername);
      const repos = await fetchGitHubRepos(trimmedUsername);
      const mostUsedLanguage = getMostUsedLanguage(repos);
      const totalStars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);

      const roastText = await generateRoast(profile, repos, totalContributions, totalStars, readme, mostUsedLanguage);
      
      setProfileResult(roastText);
      setProfileData(profile);  // Store profile data for display
      
      await updateRoastCount();
    } catch (error) {
      console.error("Error during roast generation:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="content">
        <h2>GitHub Profile Roast Generator</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Generating Roast..." : "Roast Me"}
          </button>
        </form>
      </div>
      {profileData && (
        <div className="roast-result">
          <span className="user">
            {/* Display the user's picture, name, and username */}
            <img id="avatar" src={profileData.avatar_url} alt={`${profileData.name}'s avatar`} />
            <span className="ad">
              <b>Get Yours</b>
              <br />
              <small>github-profile-roast.vercel.app</small>
            </span>
            <br />
            <b id="fullname">{profileData.name || "No Name Available"}</b>
            <br />
            <small>github.com/<span id="username2">{profileData.login}</span></small>
          </span>
          <span id="profileResult">
            <p className="roast-text">{profileResult}</p>
          </span>
        </div>
      )}
    </main>
  );
}

export default MainContent;
