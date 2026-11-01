import test from 'node:test';
import {execFileSync} from 'node:child_process';

test('independent XML/HTML verifier rejects malformed inventories and misleading language metadata',()=>{
  execFileSync('python3',['-B','tests/seo_validation_test.py'],{stdio:'pipe'});
});
