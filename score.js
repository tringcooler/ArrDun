const ARSCORE = (() => {
    
    const [
        
        PL_ORDERBUF,
        PR_STD_WID, PL_SEQBUF, PL_LINEBUF, PL_MATBUF,
        
        MTD_SORT_BUF, MTD_MAKE_MAT, MTD_MAKE_STR,
        MTD_ADD_SEQ, MTD_ADD_LINE, MTD_LINESTR,
        
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    class c_score_blk {
        
        constructor() {
            this.syms = {
                b: '\u2588',
                w: ' ',//'\u2595',
                b0: '\u2581',
                b1: '\u2584',
                b2: '\u2588',
                w0: '\u2588',
                w1: '\u2580',
                w2: '\u2594',
            };
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
                    line += this.syms[(black ? 'b' : 'w') + (val ? '1' : '')];
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
    
    class c_score_emoji {
        
        constructor(std_wid) {
            this.syms = {
                miss: '\u26aa',
                arrs: ['\u27a1', '\u2935', '\u2934', '\u21a9'],
                star: '\u2747',
            };
            this[PR_STD_WID] = std_wid;
            this.reset();
        }
        
        reset() {
            this[PL_SEQBUF] = [];
            this[PL_LINEBUF] = [];
            this[PL_MATBUF] = [];
        }
        
        put(val = null) {
            let seq = this[PL_SEQBUF];
            if(val !== null || seq.length > 0) {
                seq.push(val);
            }
            if(val === null) {
                this[MTD_ADD_SEQ]();
            }
        }
        
        reload(seq) {
            this.reset();
            for(let val of seq) {
                this.put(val);
            }
        }
        
        [MTD_ADD_SEQ](temp = false) {
            let slen = this[PL_SEQBUF].length;
            if(slen === 0) {
                return this[PL_LINEBUF];
            }
            let llen = this[PL_LINEBUF].length;
            let l1 = llen + slen - this[PR_STD_WID];
            let l2 = this[PR_STD_WID] - llen;
            if(llen > 0 && l1 > l2) {
                this[MTD_ADD_LINE]();
            }
            let nline = this[PL_LINEBUF].concat(this[PL_SEQBUF]);
            if(!temp) {
                this[PL_LINEBUF] = nline;
                this[PL_SEQBUF] = [];
            }
            return nline;
        }
        
        [MTD_ADD_LINE]() {
            let line = this[PL_LINEBUF];
            if(line.length === 0) {
                return;
            }
            this[PL_MATBUF].push(
                this[MTD_LINESTR](line)
            );
            this[PL_LINEBUF] = [];
        }
        
        [MTD_LINESTR](line) {
            let rs = '';
            let last_val = null;
            for(let val of line) {
                let c;
                if(val === null) {
                    c = this.syms.miss;
                } else {
                    c = this.syms.arrs[0];
                }
                rs += c;
            }
            return rs;
        }
        
        score() {
            let line = this[MTD_ADD_SEQ](true);
            let mat = this[PL_MATBUF];
            //console.log(mat, line, this[PL_LINEBUF], this[PL_SEQBUF]);
            if(line.length > 0) {
                mat = [...mat, this[MTD_LINESTR](line)];
            }
            let s = mat.join('\n');
            if(!s) {
                s = this.syms.miss;
            }
            return s;
        }
        
    }
    
    return c_score_emoji;
    
})();