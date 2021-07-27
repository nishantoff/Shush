//jshint esversion:6
require("dotenv").config();
const express=require("express");
const ejs=require("ejs");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const GoogleStrategy=require("passport-google-oauth20").Strategy;
const FacebookStrategy=require("passport-facebook").Strategy;
const findOrCreate=require("mongoose-findorcreate");
//const bcrypt=require("bcrypt");
//const saltRounds=10;
//const encrypt=require("mongoose-encryption");
//const md5=require("md5");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const session=require("express-session");
const app=express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");

app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://u1be15n0hnqnhlz5qpij:s3AdCk4kzilyVxxTVAbR@bqj27j8zwcbulyr-mongodb.services.clever-cloud.com:27017/bqj27j8zwcbulyr",{useNewUrlParser: true,useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);

const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId: String,
  facebookId: String,
  secret:{
    title:String,
    content:String
  }
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
  clientID:process.env.APP_ID,
  clientSecret:process.env.APP_SECRET,
  callbackURL:"http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb){
  console.log(profile);
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
});
}
));
app.get("/",function(req,res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google",{scope:["profile"]})
);

app.get("/auth/facebook",
passport.authenticate("facebook")
);

app.get("/auth/facebook/secrets",passport.authenticate("facebook",{failureRedirect:"/login"}),function(req,res){
  res.redirect("/secrets");
});

app.get("/auth/google/secrets",passport.authenticate("google",{failureRedirect:"/login"}),function(req,res){
  res.redirect("/secrets");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){
    User.find({secret:{$ne:null}},function(err,foundUsers){
      res.render("secrets",{userSecrets:foundUsers});
    });
  }else{
    res.redirect("/login");
  }

});

app.get("/confession",function(req,res){
  res.render("confession");
});

app.get("/write",function(req,res){
  res.render("write");
})

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
      res.render("submit");
  }else{
    res.redirect("/login");
  }

});

app.post("/submit",function(req,res){
  const newContent=req.body.content;
  const newTitle=req.body.title;

  User.findById(req.user._id,function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret.title=newTitle;
        foundUser.secret.content=newContent;
        foundUser.save(function(){
            res.redirect("/secrets");
        });

      }
    }
  });
});

app.get("/secrets/:customParameter",function(req,res){
  const pageTitle=req.params.customParameter;
  console.log(pageTitle);
  User.findOne({"secret.title":pageTitle},function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        res.render("display",{
          title:foundUser.secret.title,
          content:foundUser.secret.content
        });
      }
    }
  });
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/register",function(req,res){
/*********************************BCRYPT START**********************************/
  // bcrypt.hash(req.body.password,saltRounds,function(err,hash){
  //   const newUser=new User({
  //     email:req.body.username,
  //     password:hash
  //   });
  //   newUser.save(function(err){
  //     if(err){
  //       console.log(err);
  //     }else{
  //       res.render("login");
  //     }
  //   });
  // });
/**********************************BCRYPT ENDS*********************************/

/*********************************PASSPORT START**********************************/
User.register({username:req.body.username},req.body.password,function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});
});
/*********************************PASSPORT END**********************************/
app.post("/login",function(req,res){

/*********************************BCRYPT START**********************************/
  // const username=req.body.username;
  // const password=req.body.password;
  // User.findOne({email:username},function(err,foundUser){
  //   if(err){
  //     console.log(err);
  //   }else{
  //     if(foundUser){
  //       bcrypt.compare(password,foundUser.password,function(err,result){
  //         if(result===true){
  //             res.render("secrets");
  //         }
  //       });
  //     }
  //   }
  // });

/**********************************BCRYPT ENDS*********************************/

/*********************************PASSPORT START**********************************/
const user=new User({
  username:req.body.username,
  password:req.body.password
});

req.login(user,function(err){
  if(err){
    console.log(err);
    res.redirect("/login");
  }else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});
});
/*********************************PASSPORT END**********************************/
app.listen(process.env.PORT || 3000,function(){
  console.log("Server started on port 3000");
});
