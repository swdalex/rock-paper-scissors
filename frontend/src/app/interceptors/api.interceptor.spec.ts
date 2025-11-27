import {HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {apiInterceptor} from './api.interceptor';
import {vi} from 'vitest';

describe('apiInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([apiInterceptor])),
                provideHttpClientTesting(),
            ]
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should set Content-Type to application/json when none provided and body is not FormData', () => {
        http.post('/test', {a: 1}).subscribe();

        const req = httpMock.expectOne('/test');
        expect(req.request.headers.get('Content-Type')).toBe('application/json');
        req.flush({ok: true});
    });

    it('should NOT set Content-Type when body is FormData', () => {
        const fd = new FormData();
        fd.append('x', 'y');

        http.post('/upload', fd).subscribe();

        const req = httpMock.expectOne('/upload');
        expect(req.request.headers.has('Content-Type')).toBe(false);
        req.flush({ok: true});
    });

    it('should alert user with server error message and rethrow', async () => {
        const spy = vi.spyOn(window, 'alert');

        let capturedError: any = null;
        http.get('/boom').subscribe({
            next: () => { /* no-op */
            },
            error: (err: HttpErrorResponse) => {
                capturedError = err;
            }
        });

        const req = httpMock.expectOne('/boom');
        req.flush({message: 'Server is down'}, {status: 500, statusText: 'ERR'});

        expect(spy).toHaveBeenCalledTimes(1);
        expect((spy.mock.calls.at(-1) as any)[0]).toContain('Server is down');
        expect(capturedError?.status).toBe(500);
    });

    it('should alert with composed message when server provides none', async () => {
        const spy = vi.spyOn(window, 'alert');

        http.get('/no-message').subscribe({
            error: () => { /* swallow */
            }
        });

        const req = httpMock.expectOne('/no-message');
        req.flush({}, {status: 404, statusText: 'Not Found'});

        expect(spy).toHaveBeenCalled();
        const msg = (spy.mock.calls.at(-1) as any)[0] as string;
        expect(msg).toContain('Error Code: 404');
    });
});
