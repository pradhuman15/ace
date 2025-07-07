import { configureStore, combineReducers } from '@reduxjs/toolkit';
import appReducer from './appSlice';

// Load state from localStorage
const loadState = () => {
    try {
        const serializedState = localStorage.getItem('reduxState');
        return serializedState ? JSON.parse(serializedState) : undefined;
    } catch (e) {
        return undefined;
    }
};

// Save state to localStorage
const saveState = (state) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem('reduxState', serializedState);
    } catch (e) {
        console.error(`Error saving redux-state to localStorage : ${error}`)
    }
};

const rootReducer = combineReducers({
    app: appReducer,
});

const store = configureStore({
    reducer: rootReducer,
    preloadedState: typeof window !== 'undefined' ? loadState() : undefined,
});

// Save to localStorage on changes
if (typeof window !== 'undefined') {
    store.subscribe(() => {
        saveState(store.getState());
    });
}

export default store;
