import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function WordLearningApp() {
  const [wordList, setWordList] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [isInitialPage, setIsInitialPage] = useState(true);

  // 初期データの読み込み
  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setUser(data?.session?.user ?? null);
      }
    };

    fetchSession();

    // 認証状態の変更を監視する
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchWords();  // ユーザーが存在する場合、単語データを取得
      }
    });

    // クリーンアップ処理
    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  // 単語データを取得
  const fetchWords = async () => {
    const user = supabase.auth.user();
    if (user) {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', user.id); // ユーザーIDを使ってデータをフィルタリング

      if (error) {
        console.error('Error fetching words:', error);
      } else {
        setWordList(data);
      }
    }
  };

  // 次の単語に進む
  const handleNextWord = () => {
    setShowMeaning(false);
    setCurrentWordIndex((prevIndex) => (prevIndex + 1) % wordList.length);
  };

  // 新しい単語を追加する
  const handleAddWord = async () => {
    const user = supabase.auth.user();
    if (user && newWord && newMeaning) {
      const { data, error } = await supabase
        .from('words')
        .insert([{ word: newWord, meaning: newMeaning, user_id: user.id }]);

      if (error) {
        console.error('Error adding word:', error);
      } else {
        setWordList([...wordList, ...data]);
        setNewWord('');
        setNewMeaning('');
      }
    }
  };

  // 単語を削除する
  const handleDeleteWord = async (index) => {
    const wordToDelete = wordList[index];
    const { error } = await supabase
      .from('words')
      .delete()
      .eq('id', wordToDelete.id);

    if (error) {
      console.error('Error deleting word:', error);
    } else {
      const updatedWordList = wordList.filter((_, i) => i !== index);
      setWordList(updatedWordList);
      if (currentWordIndex >= updatedWordList.length) {
        setCurrentWordIndex(0);
      }
    }
  };

  // ユーザー登録
  const handleSignUp = async () => {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      console.error('Error signing up:', error);
    } else {
      console.log('User signed up:', user);
    }
  };

  // ユーザーログイン
  const handleLogin = async () => {
    const { user, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Error logging in:', error);
    } else {
      console.log('User logged in:', user);
      fetchWords();
    }
  };

  // ユーザーログアウト
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      setWordList([]);
    }
  };

  if (isInitialPage) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1>英単語学習アプリ</h1>
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => setIsInitialPage(false)} style={{ margin: '10px', padding: '10px' }}>
            ログイン / 新規登録
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      {!user ? (
        <div>
          <h2>ログインまたは登録</h2>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ margin: '5px', padding: '10px' }}
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ margin: '5px', padding: '10px' }}
          />
          <div>
            <button onClick={handleSignUp} style={{ margin: '10px', padding: '10px' }}>
              登録
            </button>
            <button onClick={handleLogin} style={{ margin: '10px', padding: '10px' }}>
              ログイン
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h1>英単語学習アプリ</h1>
          <button onClick={handleLogout} style={{ margin: '10px', padding: '10px' }}>
            ログアウト
          </button>
          {wordList.length > 0 && (
            <div
              onClick={() => setShowMeaning(!showMeaning)}
              style={{
                backgroundColor: 'lightgreen',
                borderRadius: '15px',
                padding: '20px',
                margin: '20px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '24px' }}>
                <strong>単語:</strong> {wordList[currentWordIndex].word}
              </div>
              {showMeaning && (
                <div style={{ fontSize: '20px', marginTop: '10px' }}>
                  <strong>意味:</strong> {wordList[currentWordIndex].meaning}
                </div>
              )}
            </div>
          )}
          {wordList.length > 0 && (
            <button onClick={handleNextWord} style={{ margin: '10px', padding: '10px' }}>
              次の単語へ
            </button>
          )}
          {wordList.length > 0 && (
            <button onClick={() => handleDeleteWord(currentWordIndex)} style={{ margin: '10px', padding: '10px' }}>
              現在の単語を削除
            </button>
          )}

          <div style={{ marginTop: '30px' }}>
            <h2>新しい単語を追加</h2>
            <input
              type="text"
              placeholder="単語"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              style={{ margin: '5px', padding: '10px' }}
            />
            <input
              type="text"
              placeholder="意味"
              value={newMeaning}
              onChange={(e) => setNewMeaning(e.target.value)}
              style={{ margin: '5px', padding: '10px' }}
            />
            <button onClick={handleAddWord} style={{ margin: '10px', padding: '10px' }}>
              単語を追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
