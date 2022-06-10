// import logo from './logo.svg';

import { Route, Routes } from 'react-router-dom';
import AppContainer from './container/App/AppContainer';
import TryContainer from './container/Try/TryContainer';

{/* <img src={logo} className="App-logo" alt="logo" /> */}
function App() {
  return (
    <Routes>
      <Route path="/" element={<AppContainer />} />
      <Route path="/try" element={<TryContainer />} />
    </Routes>
  );
}

export default App;
