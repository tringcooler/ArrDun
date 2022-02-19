const ARSCORE = (() => {
    
    const [
        
        PL_ORDERBUF, PL_SEQBUF,
        
        MTD_SORT_BUF, MTD_MAKE_MAT, MTD_MAKE_STR,
        
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    const syms = {
        b: '\u2588',
        w: ' ',//'\u2595',
        b0: '\u2581',
        b1: '\u2584',
        b2: '\u2588',
        w0: '\u2588',
        w1: '\u2580',
        w2: '\u2594',
    };
    
    class c_score {
        
        constructor() {
            this.reset();
        }
        
        reset() {
            this[PL_ORDERBUF] = [[]];
        }
        
        put(hit, val) {
            let olen = this[PL_ORDERBUF].length;
            let seq = this[PL_ORDERBUF][olen - 1];
            if(hit) {
                seq.push(val);
            } else if(seq.length > 0){
                this[PL_ORDERBUF].push([]);
            }
        }
        
        [MTD_SORT_BUF]() {
            this[PL_ORDERBUF].sort((a, b) => b.length - a.length);
        }
        
        [MTD_MAKE_MAT](cb_val = null) {
            let mat = [];
            let wid = this[PL_ORDERBUF][0].length;
            let black = false;
            let last_row = null;
            for(let seq of this[PL_ORDERBUF]) {
                if(seq.length === 0) {
                    break;
                }
                black = !black;
                let row = [];
                let last_val = null;
                for(let val of seq) {
                    let pval = val;
                    if(cb_val) {
                        pval = cb_val(val, last_val);
                        last_val = val;
                    }
                    row.push([pval, black]);
                }
                for(let i = row.length; i < wid; i++) {
                    row.push([null, last_row[i][1]]);
                }
                mat.push(row);
                last_row = row;
            }
            return mat;
        }
        
        [MTD_MAKE_STR](mat) {
            let smat = [];
            for(let row of mat) {
                let line = '';
                for(let [val, black] of row) {
                    line += syms[(black ? 'b' : 'w') + (val ? '1' : '')];
                }
                smat.push(line);
            }
            return smat.join('\n');
        }
        
        score() {
            this[MTD_SORT_BUF]();
            let mat = this[MTD_MAKE_MAT]();
            return this[MTD_MAKE_STR](mat);
        }
        
    }
    
    test_score = (seq) => {
        let sc = new c_score();
        for(let num of seq) {
            for(let i = 0; i < num; i++) {
                sc.put(true, num);
            }
            sc.put(false, null);
        }
        return sc.score();
    }
    
    return c_score;
    
})();