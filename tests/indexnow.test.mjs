import test from 'node:test';
import {execFileSync} from 'node:child_process';

test('IndexNow plans, production guards and resumable acknowledgments use mocked HTTP',()=>{
  execFileSync('python3',['-B','tests/indexnow_test.py'],{stdio:'pipe'});
});
