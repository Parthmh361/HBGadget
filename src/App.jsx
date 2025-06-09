import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import SchPost from './components/SchPost';
const App = () => {
  return(
    <Router>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/schedulePost" element={<SchPost />} />
      </Routes>
    </Router>
  );
};

export default App;
