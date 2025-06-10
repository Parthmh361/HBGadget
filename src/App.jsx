
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import SchPost from './components/SchPost';
import { store } from './store';
import { Provider } from 'react-redux';
const App = () => {
  return(
     <Provider store={store}>
    <Router>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/schedulePost" element={<SchPost />} />
      </Routes>
    </Router>
    </Provider>
  );
};

export default App;
