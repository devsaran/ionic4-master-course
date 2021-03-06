import { Injectable } from '@angular/core';
import { AngularFireMessaging } from '@angular/fire/messaging';
import { AngularFireFunctions } from '@angular/fire/functions';
import { ToastController, Platform } from '@ionic/angular';
import { tap } from 'rxjs/operators';

// Fixing temporary bug in AngularFire
import * as app from 'firebase';
import { Firebase } from '@ionic-native/firebase/ngx';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FcmService {
  token;

  constructor(
    private afMessaging: AngularFireMessaging,
    private fun: AngularFireFunctions,
    private toastController: ToastController,
    private firebaseNative: Firebase,
    private platform: Platform
  ) {
    try {
      const _messaging = app.messaging();
      _messaging.onTokenRefresh = _messaging.onTokenRefresh.bind(_messaging);
      _messaging.onMessage = _messaging.onMessage.bind(_messaging);
    } catch (e) {}
  }

  async makeToast(message) {
    const toast = await this.toastController.create({
      message,
      duration: 5000,
      position: 'top',
      showCloseButton: true,
      closeButtonText: 'dismiss'
    });
    toast.present();
  }

  getPermission() {
    let token$;
    if (this.platform.is('cordova')) {
      token$ = from(this.getPermissionNative());
    } else {
      token$ = this.getPermissionWeb();
    }
    return token$.pipe(
      tap(token => {
        this.token = token;
      })
    );
  }

  showMessages() {
    let messages$;
    if (this.platform.is('cordova')) {
      messages$ = this.firebaseNative.onNotificationOpen();
    } else {
      messages$ = this.afMessaging.messages;
    }

    return messages$.pipe(
      tap(payload => {
        const msg = (payload as any).notification || payload;
        this.makeToast(msg.body);
      })
    );
  }

  sub(topic) {
    this.fun
      .httpsCallable('subscribeToTopic')({ topic, token: this.token })
      .pipe(tap(_ => this.makeToast(`subscribed to ${topic}`)))
      .subscribe();
  }

  unsub(topic) {
    this.fun
      .httpsCallable('unsubscribeFromTopic')({ topic, token: this.token })
      .pipe(tap(_ => this.makeToast(`unsubscribed from ${topic}`)))
      .subscribe();
  }

  private getPermissionWeb() {
    return this.afMessaging.requestToken;
  }

  async getPermissionNative() {
    let token;

    token = await this.firebaseNative.getToken();

    if (this.platform.is('ios')) {
      await this.firebaseNative.grantPermission();
    }
    return token;
  }
}
