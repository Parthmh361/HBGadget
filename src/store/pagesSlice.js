import { createSlice } from '@reduxjs/toolkit';

const pagesSlice = createSlice({
  name: 'pages',
  initialState: {
    pages: [],     // array of page objects
    selectedPage: null,
  },
  reducers: {
    setPages: (state, action) => {
      state.pages = action.payload;
    },
    clearPages: (state) => {
      state.pages = [];
    },
    setSelectedPage: (state, action) => {
      state.selectedPage = action.payload;
    },
    clearSelectedPage: (state) => {
      state.selectedPage = null;
    },
  }
});

export const {
  setPages,
  clearPages,
  setSelectedPage,
  clearSelectedPage
} = pagesSlice.actions;

export default pagesSlice.reducer;
