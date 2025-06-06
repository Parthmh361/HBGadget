import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [accessToken, setAccessToken] = useState('');
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const handleFacebookLogin = () => {
    const appId = '24700456586221475';
    const redirectUri = 'http://localhost:5173/';
    const scopes = 'pages_show_list,pages_read_engagement,pages_manage_posts';

    window.location.href =
      `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=http://localhost:5173/&scope=${scopes}&response_type=token`;
  };

  const fetchPages = async (userAccessToken) => {
    const res = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${userAccessToken}`);
    setPages(res.data.data);
  };

  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const token = new URLSearchParams(hash.substring(1)).get('access_token')
      if (token) {
        setAccessToken(token);
        fetchPages(token);
      }
    }
  }, []);

  const schedulePost = async () => {
    const selected = pages.find((p) => p.id === selectedPage);
    if (!selected) return alert('Select a valid page');

    const timestamp = Math.floor(new Date(scheduledTime).getTime() / 1000);

    const res = await axios.post('http://localhost:5000/schedule-post', {
      pageId: selectedPage,
      pageAccessToken: selected.access_token,
      message,
      scheduledTime: timestamp,
    });

    alert('Scheduled Post ID: ' + res.data.postId);
  };

    const schedulePostInstant = async () => {
    const selected = pages.find((p) => p.id === selectedPage);
    if (!selected) return alert('Select a valid page');

    const timestamp = Math.floor(new Date(scheduledTime).getTime() / 1000);

    const res = await axios.post('http://localhost:5000/schedulepost', {
      pageId: selectedPage,
      pageAccessToken: selected.access_token,
      message,
     
    });
    console.log(selected.access_token);
    alert('Scheduled Post ID: ' + res.data.postId);
  };
  return (
    <div style={{ padding: '2rem' }}>
      {!accessToken ? (
        <button onClick={handleFacebookLogin}>Login with Facebook</button>
      ) : (
        <>
          <h2>Schedule a Post</h2>
          <select onChange={(e) => setSelectedPage(e.target.value)}>
            <option value="">Select Page</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
          <br />
          <textarea
            placeholder="Post message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
          <br />
          <input
            type="datetime-local"
            onChange={(e) => setScheduledTime(e.target.value)}
          />
          <br />
          <button onClick={schedulePost}>Schedule Post</button>
          <button onClick={schedulePostInstant}>Schedule Post INstant</button>
        </>
      )}
    </div>
  );
};

export default App;
