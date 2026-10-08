/* ==========================================================================
   Drivee — free account, for the landing page
   The same Supabase project as app.html, so an account made here is the
   same account in the app. Signing up sends a magic link; the firm list
   unlocks straight away, and the link confirms the account later.

   The Supabase SDK is only loaded when someone actually signs up — the
   landing page stays light for everyone else.
   ========================================================================== */
(function () {
  'use strict';

  var SUPABASE_URL  = 'https://ofnsssyiiejohcnbejxq.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mbnNzc3lpaWVqb2hjbmJlanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE4OTcsImV4cCI6MjA5MTA3Nzg5N30._C3k82OSOklVtKaWT4zl1rWGJyaokiRQC9H6y5VhS58';
  var SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var SESSION_KEY = 'sb-ofnsssyiiejohcnbejxq-auth-token';
  var MEMBER_KEY = 'drivee_member';

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var client = null;
  function loadClient() {
    if (client) return Promise.resolve(client);
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        return resolve(client);
      }
      var s = document.createElement('script');
      s.src = SDK;
      s.onload = function () {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        resolve(client);
      };
      s.onerror = function () { reject(new Error('Could not reach sign-up — check your connection.')); };
      document.head.appendChild(s);
    });
  }

  window.DriveeAccount = {
    /* Signed in to the app already, or signed up here before. */
    isMember: function () {
      return !!(get(MEMBER_KEY) || get(SESSION_KEY));
    },

    email: function () { return get(MEMBER_KEY) || ''; },

    register: function (email) {
      email = String(email || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return Promise.reject(new Error('Enter a valid email.'));
      }
      return loadClient().then(function (db) {
        return db.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
      }).then(function (res) {
        if (res && res.error) throw new Error(res.error.message || 'Sign-up failed — try again.');
        set(MEMBER_KEY, email);
        set('drivee_signup_email', email);
        return email;
      });
    }
  };
})();
