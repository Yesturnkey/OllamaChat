import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FileState {
  uploadedFiles: File[];
}

const initialState: FileState = {
  uploadedFiles: [],
};

const fileSlice = createSlice({
  name: "file",
  initialState,
  reducers: {
    addFiles: (state, action: PayloadAction<File[]>) => {
      state.uploadedFiles = [...state.uploadedFiles, ...action.payload];
    },
    removeFile: (state, action: PayloadAction<string>) => {
      state.uploadedFiles = state.uploadedFiles.filter(
        (file) => file.name !== action.payload
      );
    },
    clearFiles: (state) => {
      state.uploadedFiles = [];
    },
  },
});

export const { addFiles, removeFile, clearFiles } = fileSlice.actions;

export default fileSlice.reducer;
