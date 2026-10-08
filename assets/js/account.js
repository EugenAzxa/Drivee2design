/* ==========================================================================
   Drivee — free account, for the landing page
   The same Supabase project as app.html, so an account made here is the
   same account in the app. Signing up sends a magic link; the firm list
   unlocks straight away, and the link confirms the account later.
   It also backs the profile page (account.html).

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

  function validEmail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }

  /* Signed-in user, or null. Loads the SDK only if a session might exist,
     or if the page asks for it (the profile page always does). */
  function user(force) {
    if (!force && !get(SESSION_KEY)) return Promise.resolve(null);
    return loadClient().then(function (db) {
      return db.auth.getSession();
    }).then(function (res) {
      var u = res && res.data && res.data.session ? res.data.session.user : null;
      if (u && u.email) { set(MEMBER_KEY, u.email); set('drivee_signup_email', u.email); }
      return u;
    }).catch(function () { return null; });
  }

  function need(u) { if (!u) throw new Error('Please sign in first.'); return u; }
  function check(res) { if (res && res.error) throw new Error(res.error.message); return res ? res.data : null; }

  window.DriveeAccount = {
    /* Signed in to the app already, or signed up here before. */
    isMember: function () {
      return !!(get(MEMBER_KEY) || get(SESSION_KEY));
    },

    email: function () { return get(MEMBER_KEY) || ''; },

    user: user,

    /* Email-only sign-up / sign-in. `redirect` is where the magic link lands. */
    register: function (email, redirect) {
      email = String(email || '').trim();
      if (!validEmail(email)) return Promise.reject(new Error('Enter a valid email.'));
      return loadClient().then(function (db) {
        var opts = { shouldCreateUser: true };
        if (redirect) opts.emailRedirectTo = redirect;
        return db.auth.signInWithOtp({ email: email, options: opts });
      }).then(function (res) {
        if (res && res.error) throw new Error(res.error.message || 'Sign-up failed — try again.');
        set(MEMBER_KEY, email);
        set('drivee_signup_email', email);
        return email;
      });
    },

    signOut: function () {
      try { localStorage.removeItem(MEMBER_KEY); } catch (e) {}
      return loadClient().then(function (db) { return db.auth.signOut(); });
    },

    /* The same tables the app uses, so the website and the app stay in sync. */
    profile: function (u) {
      return loadClient().then(function (db) {
        return db.from('profiles').select('full_name, license_plate').eq('id', need(u).id).maybeSingle();
      }).then(check);
    },
    saveProfile: function (u, name, plate) {
      return loadClient().then(function (db) {
        return db.from('profiles').upsert({
          id: need(u).id, full_name: name, license_plate: plate, updated_at: new Date().toISOString()
        });
      }).then(check);
    },
    tickets: function (u) {
      return loadClient().then(function (db) {
        return db.from('reminders').select('id, ticket_ref, due_date').eq('user_id', need(u).id).order('due_date');
      }).then(check);
    },
    /* A saved ticket is a reminder row — the existing cron emails before the due date. */
    saveTicket: function (u, ref, dueDate) {
      return loadClient().then(function (db) {
        return db.from('reminders').insert({
          user_id: need(u).id, ticket_ref: ref, due_date: dueDate, email: u.email || null
        }).select('id').single();
      }).then(check);
    },
    removeTicket: function (u, id) {
      return loadClient().then(function (db) {
        return db.from('reminders').delete().eq('id', id).eq('user_id', need(u).id);
      }).then(check);
    },
    cars: function (u) {
      return loadClient().then(function (db) {
        return db.from('cars').select('id, nickname, plate, emoji').eq('user_id', need(u).id).order('created_at');
      }).then(check);
    }
  };
})();
