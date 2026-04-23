import { Route, Switch } from "wouter";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Battle from "./pages/Battle";
import Meta from "./pages/Meta";
import Leaderboard from "./pages/Leaderboard";
import History from "./pages/History";
import UserProfile from "./pages/UserProfile";
import Watchlist from "./pages/Watchlist";
import NameModal from "./components/NameModal";
import { UserProvider, useUser } from "./context/UserContext";

function AppInner() {
  const isIframed = typeof window !== "undefined" && window.self !== window.top;
  const { userName } = useUser();

  return (
    <>
      {!userName && <NameModal />}
      <Header isIframed={isIframed} />
      <Switch>
        <Route path="/battle"><Battle /></Route>
        <Route path="/meta"><Meta /></Route>
        <Route path="/leaderboard"><Leaderboard /></Route>
        <Route path="/history"><History /></Route>
        <Route path="/watchlist"><Watchlist /></Route>
        <Route path="/u/:name"><UserProfile /></Route>
        <Route><Home /></Route>
      </Switch>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppInner />
    </UserProvider>
  );
}
