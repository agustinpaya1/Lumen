import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LUMEN_CONSENT_KEY, TUTORIAL_SEEN_KEY } from '@core/constants';
import { SessionService } from '@core/services/session.service';
import { OnboardingComponent } from './onboarding';

describe('Onboarding consent flow', () => {
  const navigate = vi.fn();
  const getDeviceId = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    navigate.mockReset();
    getDeviceId.mockReset();
    TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: SessionService, useValue: { getDeviceId } },
      ],
    }).overrideComponent(OnboardingComponent, { set: { template: '' } });
  });

  it('closes consent and keeps the opening visible after acceptance', () => {
    const component = TestBed.createComponent(OnboardingComponent).componentInstance;
    component.ngOnInit();
    expect(component.showConsentModal).toBe(true);

    component.acceptConsent();

    expect(component.showConsentModal).toBe(false);
    expect(localStorage.getItem(LUMEN_CONSENT_KEY)).toBe('true');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('enters the gallery only from the opening action', () => {
    localStorage.setItem(LUMEN_CONSENT_KEY, 'true');
    const component = TestBed.createComponent(OnboardingComponent).componentInstance;
    component.ngOnInit();
    expect(navigate).not.toHaveBeenCalled();

    component.goToApp();

    expect(localStorage.getItem(TUTORIAL_SEEN_KEY)).toBe('true');
    expect(getDeviceId).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/home']);
  });

  it('skips the opening for a returning visitor who already completed it', () => {
    localStorage.setItem(LUMEN_CONSENT_KEY, 'true');
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    const component = TestBed.createComponent(OnboardingComponent).componentInstance;

    component.ngOnInit();

    expect(navigate).toHaveBeenCalledWith(['/home']);
  });
});
