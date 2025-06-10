import axios from 'axios';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPages, setPostsByPage } from '../store/pagesSlice';

export default function Insights() {
  const dispatch = useDispatch();
  const pages = useSelector((state) => state.pages.pages);
  const postsByPage = useSelector((state) => state.pages.postsByPage);
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [insights, setInsights] = useState(null);

  const fetchPages = async () => {
    try {
      const res = await axios.get('http://localhost:5000/auth/facebook/pages', {
        withCredentials: true,
      });
      dispatch(setPages(res.data.pages));
    } catch (err) {
      console.error('Error fetching pages:', err);
      alert('Failed to fetch pages');
    }
  };

  const fetchPagePosts = async (pageId, accessToken, pageName) => {
    try {
      const res = await axios.get('http://localhost:5000/posts/getallposts', {
        params: { pageId, accessToken },
        withCredentials: true,
      });
      console.log(`Fetched posts for page: ${pageName}`, res.data.data);
      dispatch(setPostsByPage({ pageName, posts: res.data.data }));
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  const fetchPostInsights = async (postId, accessToken) => {
    try {
      const res = await axios.get('http://localhost:5000/insights/post', {
        params: {
          postId,
          access_token: accessToken,
        },
        withCredentials: true,
      });
      setInsights(res.data);
    } catch (err) {
      console.error('Error fetching post insights:', err.response?.data || err.message);
    }
  };

  const handlePageSelect = (e) => {
    const selectedId = e.target.value;
    const page = pages.find((p) => p.id === selectedId);
    setSelectedPage(page);
    fetchPagePosts(page.id, page.access_token, page.name);
    setSelectedPostId('');
    setInsights(null);
  };

  const handlePostSelect = (e) => {
    const postId = e.target.value;
    setSelectedPostId(postId);
    fetchPostInsights(postId, selectedPage.access_token);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  return (
    <div className="insights">
      <h1>Page & Post Insights</h1>

      {/* Page Dropdown */}
      <select onChange={handlePageSelect} defaultValue="">
        <option value="" disabled>Select a Page</option>
        {pages.map((page) => (
          <option key={page.id} value={page.id}>
            {page.name}
          </option>
        ))}
      </select>

      {/* Post Dropdown */}
      {selectedPage && postsByPage[selectedPage.name] && (
        <>
          <h3 style={{ marginTop: '1rem' }}>Select a Post:</h3>
          <select onChange={handlePostSelect} value={selectedPostId}>
            <option value="" disabled>Select a Post</option>
            {postsByPage[selectedPage.name].map((post) => (
              <option key={post.id} value={post.id}>
                {post.message ? post.message.slice(0, 50) : '[No Text Post]'}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Insights */}
      {insights && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Post Insights</h3>
          <pre>{JSON.stringify(insights, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
