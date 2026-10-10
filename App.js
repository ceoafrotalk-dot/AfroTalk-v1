import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';

const SUPABASE_URL = 'https://kbgvikzufatzfcra.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KCFrFqy1c2FiYRgSeEobIg_UYp7s5q0';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if(user) fetchPosts(); }, [user]);

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*, profiles!inner(username, avatar_url)').order('created_at', {ascending: false});
    if(data) setPosts(data);
  };

  const handleAuth = async (isLogin) => {
    setLoading(true);
    try {
      if(isLogin){
        const { data, error } = await supabase.auth.signInWithPassword({email, password: pass});
        if(error) throw error;
        setUser(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({email, password: pass});
        if(error) throw error;
        await supabase.from('profiles').insert({id: data.user.id, username: name, email});
        Alert.alert('Criado! Faz login agora');
      }
    } catch(e){ Alert.alert('Erro', e.message); }
    setLoading(false);
  };

  const pickAndPost = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 });
    if(result.canceled) return;
    setLoading(true);
    const file = result.assets[0];
    const fileName = `${Date.now()}.jpg`;
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('posts-media').upload(fileName, blob);
    if(error){ Alert.alert(error.message); setLoading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('posts-media').getPublicUrl(fileName);
    await createPost(publicUrl, file.type.includes('video')? 'video' : 'image');
  };

  const createPost = async (mediaUrl=null, mediaType=null) => {
    if(!newPost &&!mediaUrl) return;
    const { data: { user: u } } = await supabase.auth.getUser();
    await supabase.from('posts').insert({ user_id: u.id, content: newPost, media_url: mediaUrl, media_type: mediaType });
    setNewPost(''); fetchPosts(); setLoading(false);
  };

  const likePost = async (id, likes) => {
    await supabase.from('posts').update({ likes: (likes||0)+1 }).eq('id', id);
    fetchPosts();
  };

  if(!user){
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.logo}>AfroTalk</Text>
        <Text style={styles.subLogo}>Conectando África 🇲🇿</Text>
        <TextInput style={styles.input} placeholder="Nome (só no cadastro)" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Senha" secureTextEntry value={pass} onChangeText={setPass} />
        {loading? <ActivityIndicator size="large" color="#0066FF" /> : <>
          <TouchableOpacity style={styles.btnBlue} onPress={()=>handleAuth(true)}><Text style={styles.btnText}>ENTRAR</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnGray} onPress={()=>handleAuth(false)}><Text style={styles.btnTextBlack}>CRIAR CONTA</Text></TouchableOpacity>
        </>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER FACEBOOK STYLE */}
      <View style={styles.header}><Text style={styles.headerLogo}>AfroTalk</Text><TouchableOpacity onPress={()=>setUser(null)}><Text style={{color:'#0066FF', fontWeight:'bold'}}>Sair</Text></TouchableOpacity></View>

      <ScrollView style={{flex:1}}>
        {/* STORIES - BORDA AZUL #0066FF */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesContainer}>
          <View style={styles.storyAdd}><Text style={styles.storyAddText}>+</Text><Text style={{fontSize:10}}>Criar Story</Text></View>
          {[1,2,3,4,5].map(i=>(
            <View key={i} style={styles.story}><View style={styles.storyRing}><Image source={{uri:`https://i.pravatar.cc/100?img=${i+10}`}} style={styles.storyImg} /></View><Text style={styles.storyName}>User {i}</Text></View>
          ))}
        </ScrollView>

        {/* CRIAR POST - CARD BRANCO */}
        <View style={styles.createCard}>
          <TextInput style={styles.createInput} placeholder="No que estás a pensar?" value={newPost} onChangeText={setNewPost} multiline />
          <View style={styles.createActions}>
            <TouchableOpacity onPress={pickAndPost} style={styles.mediaBtn}><Text style={{color:'#45BD62'}}>📷 Foto/Vídeo</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>createPost()} style={styles.postBtn}><Text style={{color:'white', fontWeight:'bold'}}>Postar</Text></TouchableOpacity>
          </View>
        </View>

        {/* FEED - FUNDO #F0F2F5 CARD BRANCO */}
        {posts.map(item=>(
          <View key={item.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image source={{uri: item.profiles?.avatar_url || `https://i.pravatar.cc/100?img=12`}} style={styles.avatar} />
              <View><Text style={styles.userName}>{item.profiles?.username || 'Afro User'}</Text><Text style={styles.time}>agora • 🌍</Text></View>
            </View>
            {item.content? <Text style={styles.postText}>{item.content}</Text> : null}
            {item.media_url? <Image source={{uri: item.media_url}} style={styles.postImage} /> : null}
            <View style={styles.stats}><Text style={{color:'#65676B'}}>{item.likes||0} curtidas • {item.views||0} views</Text></View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={()=>likePost(item.id, item.likes)}><Text style={{color:'#0066FF', fontWeight:'bold'}}>👍 Curtir</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}><Text style={{color:'#65676B'}}>💬 Comentar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}><Text style={{color:'#65676B'}}>↗️ Partilhar</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F0F2F5' },
  loginContainer:{ flex:1, backgroundColor:'#F0F2F5', justifyContent:'center', padding:20 },
  logo:{ fontSize:40, fontWeight:'bold', color:'#0066FF', textAlign:'center' },
  subLogo:{ textAlign:'center', marginBottom:30, color:'#65676B' },
  input:{ backgroundColor:'white', padding:15, borderRadius:10, marginBottom:10, borderWidth:1, borderColor:'#DDD' },
  btnBlue:{ backgroundColor:'#0066FF', padding:15, borderRadius:10, alignItems:'center', marginTop:10 },
  btnGray:{ backgroundColor:'#E4E6EB', padding:15, borderRadius:10, alignItems:'center', marginTop:10 },
  btnText:{ color:'white', fontWeight:'bold' }, btnTextBlack:{ fontWeight:'bold' },
  header:{ backgroundColor:'white', flexDirection:'row', justifyContent:'space-between', padding:15, paddingTop:50, borderBottomWidth:1, borderColor:'#DDD' },
  headerLogo:{ fontSize:24, fontWeight:'bold', color:'#0066FF' },
  storiesContainer:{ backgroundColor:'white', padding:10, borderBottomWidth:1, borderColor:'#DDD' },
  storyAdd:{ width:60, height:90, backgroundColor:'#F0F2F5', borderRadius:10, justifyContent:'center', alignItems:'center', marginRight:10, borderWidth:1, borderColor:'#DDD' },
  storyAddText:{ fontSize:30, color:'#0066FF' },
  story:{ alignItems:'center', marginRight:12 },
  storyRing:{ width:58, height:58, borderRadius:29, borderWidth:3, borderColor:'#0066FF', padding:2 },
  storyImg:{ width:'100%', height:'100%', borderRadius:25 },
  storyName:{ fontSize:11, marginTop:4 },
  createCard:{ backgroundColor:'white', padding:12, marginTop:8, marginBottom:8 },
  createInput:{ backgroundColor:'#F0F2F5', borderRadius:20, padding:12, minHeight:40 },
  createActions:{ flexDirection:'row', justifyContent:'space-between', marginTop:10, borderTopWidth:1, borderColor:'#EEE', paddingTop:10 },
  mediaBtn:{ padding:8 }, postBtn:{ backgroundColor:'#0066FF', paddingHorizontal:20, paddingVertical:8, borderRadius:20 },
  postCard:{ backgroundColor:'white', marginBottom:8, paddingTop:12 },
  postHeader:{ flexDirection:'row', paddingHorizontal:12, marginBottom:8 },
  avatar:{ width:40, height:40, borderRadius:20, marginRight:8 },
  userName:{ fontWeight:'bold' }, time:{ fontSize:12, color:'#65676B' },
  postText:{ paddingHorizontal:12, marginBottom:10, fontSize:15 },
  postImage:{ width:'100%', height:350, backgroundColor:'#EEE' },
  stats:{ flexDirection:'row', justifyContent:'space-between', padding:10, borderBottomWidth:1, borderColor:'#EEE' },
  actions:{ flexDirection:'row', justifyContent:'space-around', paddingVertical:5 },
  actionBtn:{ flex:1, alignItems:'center', padding:8 }
});
