/* 디비빅SQL — 앱 */
(function () {
  "use strict";
  var C = window.DBBIG_CONTENT, P = window.DBBIG_PROBLEMS, EN = window.DBBIG_ENGINE;
  var LINE = ["#0052A4", "#00A84D", "#EF7C1C", "#00A5DE", "#996CAC", "#CD7C2F", "#747F00", "#E6186C", "#BDB092", "#D4003B", "#77C4A3", "#0090D2", "#B7C452"];
  C.forEach(function (c, i) { c.no = i + 1; c.color = LINE[i % LINE.length]; c.quiz.forEach(function (q, j) { q.id = c.id + ":" + j; q.cat = c; }); c.lessons.forEach(function (l) { l.cat = c; }); });
  var ALLQ = [].concat.apply([], C.map(function (c) { return c.quiz; }));
  var LESSONS = [].concat.apply([], C.map(function (c) { return c.lessons; }));
  var QBYID = {}; ALLQ.forEach(function (q) { QBYID[q.id] = q; });
  var PBYID = {}; P.forEach(function (p) { PBYID[p.id] = p; });
  var LVN = { 1: "기초", 2: "중급", 3: "DBA" };
  var ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAuI0lEQVR42u29eZDk53nf93mP39XdMz3nzuyNxWIXwOIijiUIUOARHhBBWiJlypKLFEuy5Shx4jhWknJkVWI4vpKqRBVXqVyhzTgyQ1KxTIZSzJDBQYqHwAsHAYJYAHtfM7tzT08fv+s98sfv17MDSBQheWcB0uqqwWJmumemn+d9n/P7fB/Ba3xIKaQAYZ23AI1YNe6+efTuB++ffvDokfbR/TuT/Yf3Nw8LgeAn+OE9/vi5/vFzl9JzTx7rPPnIN5ceefrFjacHmR0AKCmUB++cd6/l570mYSkp1FDwtxxs3fKxD+z+2IffPfvh63c3rucvHpyeG5z+7OOXP/vJL8x98oVTvRdeLbM/twKGp9l7/K03jNz66x+97tc/+tDujwZaBMPnWOetAFE9frJP/9Zb4L33HrySQg2/XhpffuqLc5/6rU+d/a0fnOz+YKv8/swK2KrBh3/t0MO/8deu/40wkCGAsd4oKdR/KAJ/LQqxzluthAYoSlf80391+p8+/PETD/+o2yD+NOFPtoPJT/+TN336wfumHvwLwf/ZFfHIt5Yf+cjfe/YjK51y5YcpQfww4R+9pX300//4jk8f2tc89BeC//Mr4sT5/omP/OZzH3nyhc6Tf5ISxKsjHee8u+dI+55H//nRR8dHg3FjvRlq9HV5MwhAbBpRga8/8694Gz/8ea/fYyi7tY1y7b1/88n3PnWs89RQxn9MAcPTPTEaTDz5qbc+eWB3cuD1FL5H1n9gCcIAtvpzvQI0HoVHbhG02fI8wGsgwKFeV2UMZXhmLj1z9KNPHF3dKFe3Omax1fQ4792j//zNj7773sl3v17Cr4TqQGQApG6CFbebBbeHdTdF142T+galD/C1cCWWUOQ0ZZe2XGVSLbBDXmBcXEaKHniNJ67vk3/dlPD4d1Yef+/f/O57pRByaIrEVrv/93/thr//8K8devj1EL6vz4IQA5xPOGNu4aXyLi6Yg3RMi8IpnHN4Z3HOgN9qhgReCBAKKTWBEjS1YTpY4vrgRQ7rZ5iSp8ErPFGl4NdJCQ9//MTD/+DjJ//BUOZCSiG99/7w/ubh53/vgeeVRF3rmN4jESIHD8fKe3m6eAfzxR4K6/AmxZoSvMN5j/fgPHjvhw7vivpEdaKEACE1QkWoMKEdGo4kP+Bo8CgT8gz4Bh5xTW/DMHewDnvbX/nGbcfP9Y8LIYRSUijncL/16zf/1l03jd5lHXZrcrHdD4dEij6rdidfHHyMJwbvZi2PsUUPW2ZY63C10I0D6zyu/tc6v6kU68E66u8JrHNYW+CKAVlpuFDs47i7FyVjdqqTSEo8wTVTghAI67CBFsFoU49+/g8XPq+kUALgpuuaNz33b37qOa2Evpan3yGQYsDLxVG+1P8FOkWMst1KkF7UgnU4VwnZV8eoFvqVr105ZX4zmhCi+hiaKC09QmlUPMGb2md4KPnXNFnGk1wzkzS8BcZ6c8cv/NEdL53tv6QA/u4vH/y7D9w18cC1PP2V8FO+k/40/677C+SlAZNivcR7gfMeV5/wV7zO+/r0u0oJsOUm+E1FOF+ZJefAU98S4/Fll0v5NOfEUa4Lz9IUi3jCa3ITrtwCGWS5yx779vJjohGrxrHPPXBs/85kv3PeSSnktgvfC6Qc8I3+X+Kx7vsI/QZu89R7vPM4KgXYSoI4D9Y5ytoEOe/xzlYZQf25lAIpaq8iRH0LqhuhZCVigUBg8brBnvGAj038C3aIU9fsJgxlfO5Seu7IX/7GEX30lvbRPTPxHu/x10L43ktkkPLs4Kd4rPMeAjawvhYiYLzACYH1UHoHUoH3FKXDWY8xFm8doj79xjlK4xCicshKSqQAKQVaCpT0CFH5BSGoFIOEvMfZpQa/yy/xNyZ/m4S1a+ITqqAHv2cm3nP0lvZR/Z63TL1nGBIpsb3mx3uB0Jbe4ihPrNyHbVtU7nBC4aREOEtSZEhXomyJKC1FUTAoLFnu6fmAngjJpAIpaWoQpqxDIYFxlb+QQhIG1UelFIFSoARoJVFSABJR9nhxcZz/T7+fnxv/JP4aRafOe6ekUO95y9R79D1H2vdsieC21wYqD9pxdn4vh77zFcR9b+f8+G6kNURnT3DTM48zPT6KiEJCJQHHRi9FKAlK0y8FCwPDsm4yF41zKZ5iQbcoPDQkNAKBFJUCeqkjChRSVmZISolWgmasCGolSCERxRpfW7yB+5oH2Rmcwvto22/BUNb3HGnfox7+Tw49PDEaTIBg26IfCXkmefnpUSb3wpcuv5XmyVPsvHyGYnSK+ahNFjVYtJLeyZfh0jz5IKPXHTDoDegPUoRSJI2QyViwPyi5ya5xY3aZqbU5so0uJ1ZyznYKVvoFyxs53X5WmSo8/cxQFJY0txhbmSdXJ3JKQq8MGU9KDjdexLsQIbbbIVeyFgKh/tl/c+Sfba0FbUOWBdJTFAHf/XyT/sgs39B3sefyeWyvw568w/6mZMYXqJndLO67mfO9gsUTL1GmPbRWCOvprW3QX+9QGI8LAnSridIBO8i5J+rzZrnO+GCJ7sXTLC5cZrGTstBzLPZK1jcGDAY51nmywpCXla3xokrGjJc0Ism97e9XpukaREPDupve/iy3ise9kRhbcOEJweC+hJWRCfYM1lhaXKQ5+BY3793NnXFMqTULb7qeuTFN58Qxzq+uEgWKdtIgdLB0eQl7eRkhIW63GZ2YoJE0mIo8D+oed8ucs2tLvLxxmpfWA86oaZZbe1hujDBVGkbjkCIvKUtLIwkZb4V4mXN8KaTclRCIvM6Sr83jmtV7hHNYoQhW5rj78sucn7qO2fMvEsYN5i5e5vLlBcKkQXukSTuQ3Dw6irj9CL1uj+VOl7WNDbpZig8kZT8lTXOW1taI5i/TmhhjcnKSUGviZot9QjHdKLg1zbnQm+NMvsrlxk2s9x2X+yFxM2G/ljjn6hKGoT9wdMuIiSitK6n+J0sBDtCBYrlfMvrsNxi77e2sxG2mRcme6QmMLelmBYtLK3R1gFzskBY5SRTSShpcNzFOrxylZwydaEDn0mXyQUFeFCz1upy7eJmJsVEmx0YJQ42TnlhL9jRG2eFKpDhP7pe47CKe6k5zJp+k1YrYYS1KSghiOkXAROLxZmsW/WOugDovQgVgMXgvefn8PGH3Edo7djDIMpqtFr2NAuk97UaDXlkgjSEMAjYGGRuDFG8d/TQnasa0221GDx1kpdNjbnmRvNOnLHqsdTpcuBQwNjpCa7RFoDWFt9jC0OsuMShLRFlwqxPsUzHzE4c4ld3OjpbGxRHz2TQHxubxhD9BN0BU7yWMPegSQcDAeM6fPcfa2jqHpscwSJKxNquddYrBgFBrFja6JGHIrolxsrJkfZBihCfr9MgHGUmoaTdGmLz+AN3SsLTWZbXTodftcmlxFbG4RhgHxHFAHAaAROIprMc6y2i2hBCOF4KdlHmLJBF8vfez3C/nEawBwTVRwjUxQd4KVGIJR0sWjmcICU4olnsDhIDZdsE0nvbYGIN+H5PlzI6PMb++zgvnzrNrYoLxRoPxsTFSW9Jf76C8oExT0m4PH0hmk5jpkd0UQmKMZX2QstJPMdbQE6CVQjYjYgS6NBghcNmAh9xJjnEjF3PJdy42+P6BD3KH+Pg1qw+ph3/t0MPb32gp6Kp9fOb5W7j05NexUYAUAq0VuXEUZVHF5NYSaoVGYEpDEgYUHs4uLGGLkoZStEdatEZHMcZQmALrYJAWdLpd+p0N1tfWKfKMUAqkknitQIeUXlA4TyHAJwmN1ii3Tk1zIJJEG3OshBP8YDXDNm/mP9p1hsAu44Xe9mho2xXgvERGBZ956Sj/yzO72Nl5jvW1NZpxC1WHe8Z6NgZ9ClcSKUWoA5SUWO8YbTQRUnFxdZUsz5HGoL0niSO0DnDekpcFqSlQUuJ9pdB0MMBnKTLt0ShSgrzPuM3YF0j2B5bZrMeOMMAlMb35s9w9HnJWNnjyEty0c5Qj4y/gbIjc5qRsWxVQ5QCG3I7ztx+9HTk+yT6xwdyx79MtbVWT8R5TGlJjmF9doz9I0VIQRgGhDiiNIdGKOIy4uL5GP8tQSiK9QEpBHIU0ohjlYVCWeASx1gg8WkqiIEALQSuJ2D0xzs72CGONiKI0zGeGcVEwPj7JrDIc3jvL40sFy8UUv3joDJps2xMzvd1lZxVZvnRsNyfSaf7yRJf0wgnK5ijSGs6uLNMKIiKtGJQGEUasrK5zammZA2NjzIyN0m41CJWmISS7R8c5s7JML7/EjvYo480mURiglaQZBniZYLymyAu89/TynO4gxeNpmIjcwpmVdfplzpwLkEkLnfdpxDG9KOGubJ7/4oZD/M+nDV+ev56f3vMktmygpf/xVEDlxDT/6oXd7FN9kq99loXVDvcfPEje7bHQ7TKwhrV+xv1vvY13veMuFlfXOHfxMraXYfoZF1Z7iNJijSWIIlQjYaG3wfqlBSYbDabGR2kEAXhB4V2FqfC+rnoqBtbRKQqyXkphTN3AsWQ6otUsCfaMM9NukeaG0yfOcN/OLn9r9AhfOn2A9x16Dk0JtmoSsQkc8G98BXgEQpZc7k5weqHB4Wd/h0udBfZPTmG7PRpxzL4g4OzyKnkU8rYH7mRycox2u8XNN16P1AqPoMhLsjSn3+9jyoKsyLFlyeKFRV743gkWz8/T1AFJIyYKYwQZ4HHeIZUiCRS9QhILATj6RU5/MGDnwTHe/qYbOfXsi8xOjLF3ZpzCOzq9Pm/rfxPnd/G9cD/7rl+jPZ6io7LCHEkBhQIv3tgKsAb0mODUuZDG1z/HmFhgZHSCtN8n0JrBYEBeGtJ+yh13HmL3rmkGaY4QgsI4Ih0ihKA1mjA2oZFSVu1IYyjynBsO59xy1xFOvnyO08fPs3RphcHyCnlRIAFXd8/W84LCgtaKuJWw9+Bu3nzvbTz4028j8vC/nzjHV188yztuOsie6XHiyRDnPWV/g9NPKM4+PU0wWjK1VzK7K8D7lF17F4ni8qooQW9T8xk94pk/G/D53z7J0dAwPTpD6S0STb8wWOvo5Tkq0rz3vfeCEARhAAKCMCKIY4SQdR4nqh6yUkgdEjdHEFIyMbOTgzcfwVpDr9tnZWmVTqfHRqdLXpQY51E6oDnSYHy8zczMFDMzUyRxxKCf4ZTgxrtvwj/xPI++cIK3HtzL3vE2XlWNnCR2qMjhbYul0w3WLglm9xfs2u+4Wu0TvR3CF5Hn5e+H/Nv/06IHDXaMgS0N1lmcrSqRWVGy3Onyc7/4INcfvo5eb0CUJEitEVIipUTpACFV3duViBrqMERHCKVw1uFRjLbHGJ+cQNavlcOCu6xst3MeYx2lMWx0B3g8zShm91238L0nnmU8Dvj68bPcd2A3062EwlpUoEiXHCLy3PRmzS339BmbzN64JqgSvuPkD8b44qc0ketRRIJBmmGsqYQGWGHwrYiPfPid3P9Td1IYR9Jq1YKtT5eQVxy5B+dsdQOErBIsVyPjtEJ6h7OGoiipnu5rwFbVexL1a5SsbtRQKVlecPDgPrqtBuX8Co044fn5BQ5PjRFoyXK34Pb7It75fs/UpAcLPguuqhO++k14L3EUqLHLLGYX6KQ9emVJryhYL0pObHR5ZmGJn//oQ7znPfdRGodSqjqtQiCEJI4CkihEComxDhUEtEZaSCURUtYCVUipEFIgpUIFIToIUUFAEEa0Wk3G2iOMtUcZaTUIdAVtHLaiAKx1NBsJt95xE500I9AKYxwLvYxMRSx1LanVTO1SuFTgjbjq3TJ9lTs9UMDhIymH71Scf/E6/rt/sshLC3Psn5nh9Noqpy/M8+GH3sbdtx1meW2DOIkBMGWB9xXa4VvPvcDTz5/gwvwSvUGK0ooH3/UAH3roHRhrEUJewYPW6Iiqv6cQQmLLnGMvneLS4gpCSiYnJjiwfxdT46MM0qy6iaJK5Jy13HjLDTz2+18mUoKGDCnKgqaE3RMRx5/KWD7XYGqHwZfijZ8HeADr6c+3eeqxNstrJ5hotVhJMy4tLnLjvp38yi88RJoXBEFQn0SLNYZ0MOD/+LeP8LVvfw+8w1pHaS3OWU6dvcjb7r+LybHRLUoY9lf9Jiou7azwO5/5Az7/2LeItaogYEIzMTnBe9/9AH/lZ96NlgJb44iKwrBv3y5kIybPUq6bmuLFlWXOra5xeHaG83NrnD8tmNoNvrj6fYJtwQGJAJ7/Zpvnn1/FZj2iKOLC0gKx0uzZNcvoSBPrHEprvPdYa0nigEe+9iT/5t99Ge8d/SzDAWEYgJDcccsNjCQhxtra37hK3VsQcXjIel2e+v5LXFpcopcOSLOcNEtZXFzgt/+33+F//fhniOIY7ypfY4xhanKMo/fewcW1DdbSlOsnxlnc6DMoSna02yye93gvfzwyYSGAUnLD3YuM3ZiRfuEmHn38NNOjI5TG0+l0cR6CKKoiGO/xzpGlJYcO7GZ6eoxGkvBzD72de267kZGREZTW7No5UyVY1iClunLbrkCk8XgmZnbx1z7yQUa/9DXarSZhoDh15gInz86x0etT5ClyyzEWQmCM5Wc/+A7mv/8yp5dXmRlNONhOWF1fY2ZkClEkCJVvS5dM+Gfetz2FDulhXPHJfwH/8pPnGRvTrPQG/MZ//cvcdssNFdREVEJ01mCMIY5CllbXEd6zc8dkHftrlNYY60BIlFI1Br0OS7fcACGqWZgkDqvKqHMIKen3ejz7/ItcXFjlXW97C61mA2PMpkCd88RJyBd/9w/4xhefhCRgNAzZ3QxohTGTE6O85QMlB44MwF3dhv32lSIcuAXNpRcdeyZbnF9e4MYbD3D3nbew0e0ipazObB2ZaK0pjGVqYgznHP28ROsAicN6g6wjpU18p/Ob/U5R2/9hA26QZpvXw3uP0pr73nIPgVL0BlktfPGKjpdHsO+GAyjxFKEIEGGCwaGlxCtDbixFKokSz9WEkOrtAaCCTODEC4LTF1ICaRlTmpE4Iq/fvJACa+2m7RZCoJWqnaMi0LKuZ7PF4dbmpo71r0SE4koIUCPeqKHrUkrwnv4g3fxcvMqWCAHOWiZ3TNFoBEQBgGUxtUQiYypocdPteQXedeKN74SrToNgcT0jzfoEOEaCAOMq1DJ1GLlVAEJKpKiTpTofaDQSoiDE1UgdAdVp9w7hLFiDGH54W3+/fmNK0mwm6LqoV0ETq0Tuj9sQgbOOxmiLuBkxO9Jg70iMlJJTSxv084wy254W8TaioSWDDYmyDi0kY82IzJnNhGvrWBG1YCsYuUJJSSAFx46f4fLyOs0k2bTxQoB0BmFKZJFDkSNMAcaAs+A9gdIYY3jm+eN0egOSKKxuGZXPEP6Pl3JENWdJzzmkF0RSMZWEeB8ydkgRti3Oih+XfoAEX9Jdq6qS40lCmuaspNkVaOqwluK3yMJ78nSAsCVf/ObzPPnyeZ5+5ln++//yr/O+tx2l1++jPZXAyxxpXeVDlEaEEV6AUIpBv8fnHn2Cr3zre8zNX+Lj/+NvcMO+nWR5sWl+xCsIHDxCSJyxXN7osj+MGQs0Mi2YFI6V8yXYACEKrjaGWW4L8NQP8HIWL2YYiSRjjZjSOQZZjrOWrXGEGE7dOY8pC/LuBpcvL/GFr36HMstZXFrmE//XH1AUBuk9mBxRZKiiQJU52hlEPoAiw5cljTDk+WMv87n/9yv0Ohu8ePIkv/sHjxJpXZUihkPe/kr4OrwCpjR0BjmlMYQeDh+9lff9p7+I9NN0Fg0ieOVL3oA3QAA5mTpM5j5COPJlGvo4E0mTed0lzdIqi5UCYSt77b0H5yqn6jzKe/Ks4MLcPC++fII4iVhb79Dd2GAkDnCmRJTVhytzVBSDKRFC4pVG4llZ3+DYy8cZa7doxBGra+uYokBYe8WQb3HEQ+ecZxnrgxTrPc469t90HTfcews7b7qRMngU3LMgEq5mGCSvrvAtVoyxkj3I+oU5psaquFwB7VbMoMgpS7OZCImK76ay33mOMCXKehLhEVJSOEtpLCONhCTU2LJEGotwDl/kUBQIYzZ/hrAGZwxjIy3SsqhnhyXjoy2Us/iyRBgL1uKtpZ51qvyCEKRZwaAsSMsS1UqYmB2ne3EebVboi7dSuh3V5P5VNENXWQEFfXuEzuUuqye/j+itEjU1pTWMNpuUhak6VqLKAXAOTInPUlyWQpairGHn2AgfeMvteA9T7Rb/8YffRxIEeGPBWaT3+KJE5AUiz6ucwBkkMOj3efNtN/HLH3yQPC/Yv3OGDz1wD3lvA1FmkA+gVh7W1mFtFZ31BymldQwKy/iuCcrVBdL5OdSgg9mwdIqbQZjNofI3mAnyIDXdjTb52gIyLxmRnlsPz/LSSwuMTYyRFwVpmjPRHq1OrTX4IselAyhKvFJVI0Zq/vaH3sOH3nEv4xNjzMzOkKYZSl7xHiLLkFmK9A4RN3FaIazDGYMKBP/T3/lV/sYH30MrDJkcbZJ1NqhTP1AaggAI8UJWzltAr9fHOmjOTLNvR4PBmdOsLq4wtXcn44ci8mISIn1Vh/n0Ve3GoMkyX5V1x9u43HDnrTFLyz1WVvuESpFlBZLqxFamp8BneXWitUYFlbN0xnJwdhqjFP2NLkEcMxzikghIU2SRofAoofGtEbyQCOexRUE/yzkwM40tMvJuH2nNFayGqk++ENUQoNRIIdjo9pAI3vv2W9m5b5KsMMRxQtrvYdM+uh3ivb6qkEV51YvRzhA0moRJgyCJ8VLy1jcfotHUZN0BgyxHClGFj87hTYkzJc4YvLW40lSmxlrSjS42L5CCymZ7iZABIs0qkzU+Co0YMbxBtTkRHqT35IMBZpAiTVn9LusqwZe18m1l0nzNzbK00mF2fIQj1+0gNxYhJa2JccZmdiCkrA/AG7Qh4xEIYdAqw+odyFAj6OOBKAp437tu41hRVO1EX+neVcxG2LLEG4scpghSVonZZrnHD38DUirWFhYol1YZb1QKdsbgyxxcvOlQr4w8iiu8Ht5VX64ReXXQvFm20GHA+991L80kZC3PCbRCBpowCrFhgpAdhDDgrx5yWl9dGLojiroMshAfOYQxhHFMvyjQSvH3/rO/ihifJs1zkLKaB1YS6zzemYruh6rpTiNBhgEoWZHMSI0TEm8NttlirpvRf+kM7Ylx4p2z6KQJUtcmRdYNGovfLPrZuqHvwKvqz1UKpEIpxUa3x4c+8C7ifEB37TJKK7xWCBEgwhATtwj1ecBeVeS0vtr94Fa8zNJ6iZcRIk4IRkZQeUFZGkSWEimJNdWAnJcKFwS4OAIcXiickhBohFJYVSGbZRjhlcYLifEwvm8/rakpim6fIIxQjQYiSioktJKbjtZLVf0e76Esh5PSEAT4KIIwBq3xVNQGgQ4gc9goqWpPSiLCGMIQLzSxvnxl4OGNZoIq9IKiEa2g5Bq5202z1UYjiJxD5gU6iXG2phcQ4IWEMIKkiQiCys4qCWGMj2OsDvBVXQ8ZaBwCrxXehagoJpmYxruKxkboAC8lXsnqpFuzKWziBEyBt6aqA0Ux6KD6npB43LC5Vn3NxVWyqCNUc4TCeqTv0tCXwF/daXp91WkIVM5Y6zyLq+MkzRg1Pk2rOYrSEf08I81StA6uhABKIaIQogARhFVjPQgQWle23HkGq+tYv8r4zp3oRgOExG1CtrYU9wS4LKdY76CCENVIqsZN6PEuQgydsJTUE9x1RcJvBkWqNU4wMgHeoMIYa3NKIxgJTqFkD++TN2gYOgStWs2OsTMsrOxhddExNjtLMDpFkWd01udQOkBJvTmni6zQDB5fmR4dgKrsuACk1oyMT3Dx2EtcfOYFJnfN0JqeJGw0UGFYWQQH3lnKzgb5WofW5BjB7GyFHVJVjwDUJtZoax18CPLyCCQe60pk0kZJQWlSTAmwwXj0/at++rcJGSfRKmXf7HM8//IdZHlGnITkWYZ1jiBuEoS2CkN9jXjTqg4zX10gEyDBCcn+W4/QHhmlM3eZtaVVcB6pdQW4CgPiRoMwiWnP7iCcmsQHQR0N1cnXsPYjBMKDq4ty3tUVVaEwxQAZRhT9FaSUeK8ojGAm/hqB6oKPrnoYui09Ye8FIjBcuDTBMz/YgxBNkjgiSiKaoxHShgRJhDU5xhiMKbClQUchQW2GhvBCKWVlZqxDA8o63GBQlTEQCK0QQR39BAFeKXwYIIPglVCZzXC2MlcVp1CV8EmluHTmHEKHjE3PoIOgto8DdjT+iMnG8W3jkNDbM4rv8aVm785V2q0ep86MkJYjOJdw6rGUqQnP7AP3UGRgTYkpS/IsQ7uqRal9AFqBqFgRa0pQSusxzlWmatgblrKGGlJxQwx7x5tICTZ7AJtALucq4VuLVJLeSocLX3uSoz8b4uwuhE9oxF2mWmdJwg3YRgIPvX18CJUSRpuGO+9YBblK1vH868/H7NsTMDN2jBNrtyG8xdmKZiZP0+p8xh5NABqEq8g1QCBU1aoUKtpCTSavUJAMo6hN3FAN5q3r/0MIjPeu6g14B1Kw/PwF9h0SHL51EQYLdZfIVxPzfntnhrd3QkZ4vBXVhInzxFOCvbdDZgWTky8xNz9NZ6OFdxYhBNZ5ijpbHjJdVQxGssKBDpMnrqCet9r2mpGpEpfzm7CX4X+881eE7yxeaTpnl6Az4Mj7HD6XYBVC1lHRKw3Yj+mk/HBUXgK5554HSsrCQum5Yff3eLp7lCK3OF9gTAVR3EQ+1LUddFAJe4h4kNVN8Fsa7OIVzXZfZyZ+k9ZyiB9yzuG9xVpFFKxhFl+mMaGZ2NlDGAHSvfbFCj9WZB01cHfHLkA4fKppJBscuf55vvvcjZR5ifMlzldwFe8rrlt8HetrUZWO/TBg3JqTiq0N0U0lVHNd7kqoWQvfOYExOTdMfB0/U5JmDURo8X3F9pO2vU4KGMrJ11VhIT3eBEyOLXLnLYJvP72Hft+ilMGUCmMMzjmSRqOiOgAq+oAt9r4uvA0RcWJrw19UfuAVwncWYyTW5RyY/jqxWObAzRHep5Bde+FvLzTxz8gjt7I+whNPTbK2LtC1DwiCgEajQaPZJEkSgjBEab0Zpg6x/lLIqm5TT9NsWu9hxFML31qPEmvsn/ouI8kq3oaI2uS8XkTrmtf5IYQHZ5kYy7jzjpAnn2ky6K8DkqIoKMuSNE1ptpo0Gk2CKETroBrqqENQKSXSaaS0r0DRee8qc+Yczlmy1LJzcp4kyurfXfUYeB1p7l9XBVRTRI5LnTuZWzxIZzUlCdbwUYOiLDA10CrPMkxZUhbFphKqcaXhHFhVUt5USl3utzUMpcxyeutdcJB397C4cpCZHZfYO/EMckiL/x+aArwXCFVwfvEezi+9CVuuk/dXyQY9lNQEMqQZgsPRzXKstZQbPbIsJ04SgiBASrFZNpZKoeqRpWGjLwokndUNVhZX0EoThAHeWgLV5uL8IXITc3j2DyuivtfpFujXayuGUCWd3i7ml28kDDMGpScvLMYYrLA455mdnGZmJODy0grdvCC3jtJZBr0ealgHqk+/1opAa6JAESlFJD0NHdOTIf00Q0tB4hKUUDRHBYnusrh2gLHGRXaMHsfb6BqwJb5BFFD1DiQXl25G4FFBjPUFxjqKPGekPU5rcgYdaxADWpEmUdVYqgrCuooqNwt5SghUrQwhatihr5oyo2NjXH/4Ji7PzTHobRCFUZWkBQmiNJxbvpWpkbPbzoryhlHAkMKg05tlozuB8F18KZFKUxYFcZIwuXMvne6AotthevdIVU4QVdQjtUKH1USkVAqh9JUy87C8XGe9KmywcfkS4Lju0I2cPf4yeToAKbFe4uyA/mCcld5+pkdOVD2Da2yK9OvieYVnYXU/RVagZInI+gQqIggDpianyPOCjY0+jdAStMcJS4OyBgTouIEKgrpvoOubUDdlnNsMP21ZoKKIvDCYbECYtJi57hDrc2eQQUCWDarnuYy51YNMj5zanEf4iVaAkJY8b7O6NoW3A0rjKMuSIG4wu3s3RXcdH4GxliAMiEYnyEpLICqktZByM9qROqyTL/+KKXrhwSuNboxghGAw6DPmLE4Ydl5/CGdyijzFe4GnZGV9nP7MFM1oGe+Da3oL5KmLg1M/at3e1Yx8kJaF1d2kA4GzRRXdFCVlOiDQVd9X2BypBLsPXIcIE8LGCEHSJIgbqCBCBBFChwhVJWVCBQgVVpghFSCURgYRKgjZef0hvI4pCoNwJd6kDPo9yizFFDnWZGT9kvm166o6kL82ixwATl0cnJInLwxO1tfWb3/S5XA24tLCFLYc1Jsxqo88z+mtrZCMjJIPeoyGnvHpWWQQohstgrhRKSCMkEpvckogFUKpqkAnq6E+qTQqCJFRwmirQRgIsmyA8ob15SXSbociSzFltbcG0+fiwjTWNhHCXQMFVLI+eWFwUj51rPMUVxDz23v6lWN9o8nKEjib4WpeYxUEOGfJ84ys36MxMkGRZnz38UdYW9sgbrYQKkCFETqKUUGAlBohFVJt+VcF9Y3QRM0Wixcu8L2vPoaSgqSR0F1foyyKCvroLM5WYa/3OZ11wWpnDJSti3jb6gY9wFPHOk/Jx769/Jh13kqx3aUoX6HhKFhammfQT3H1hDyA0gFSKYo8I+13GN+xAx0EPPWHj7N4aYG42apOu9SVuakFXw+Y1RvCqqw4TBpcPHWaH3z32zRG2jRbo/TW16uJybqOJERFj1BkKVmvx/LlCzibci0qcsM9Yo99e/kxtbRWLP3S+3f/0thIMOacd0JsD2lvNYmoaLb7COk4fiJCiRLn7KZhVEohlcJaiylzRtoTBFHE3JkzRI0G41OTRGGArDNfqSRaK7TWxHFEEsc44NzLx7l48jSt9jhSCgb9XlVLDcOa4sZiy5KyLCiyPv1McNPhCxw5vIwro23NCYYrTC5czi785m8f/01VGl/u3hHvvv+O8futw27XGhOPQOqc9Y39pOYBksYIS4uL5FlWL9upwLAIgVIK7yHtdxFAo9libXmV0sP5y4sURUlRlvTTnH6a0e0POHPhEifOzWHW11lfXEZHEUWWYo25wsaCqJi06iJfnmUEUYPrjtzOxOzNhKJDEi7VkdD2PIYy/sTnL37ii3+09MVrssaqKjkXLKzdxNm5N1FmA4QwlEXJyZOn6G50GR1p0khidKDRYYiqT6pzDh0ERHGCl5rHn3mR//srf4RWEAYBzjlWN3qMjbT46+9/J7fs3UGWVYPasg5XoQYBW4v3jjwvKIuSpNlkcnY3OozwsolOmhze+U1mRl/YltLEn7jGSiuhF9eKxUP7mofedOPom6zzV/UWVMLPWVg9zMlzb8Jk65RFSpEXOGtot0fJi5Ljp89yaWGRPM8xRUGZ5xhTAh7nLGm/R5n2uWXvLLtnpvnq088zf3mBxZVVbr1+H//tX/1L7G4nLK+uUJYF1hpcPYbkrKUsS4q8IE0znPOMjo3RajUxRYYtC7wr8LZkuXeIRpLSSi5f9W0a1nmrlFCf/tL8pz/x+Yuf0ErobV1lWDnFgm66i2OnHyDdWCFLB9UmJO8pihwhJY0koZ9mnDxzjvmFRcoip5UkNOOIyYk2cRiidJXxlsYy2ohZSi3/+NP/DzftmeU//5l3sr6+Rl4akjhByIoCxxiDtRZXzwgrHdAaGWF0pFWBAGoaS7xHSIUOY4LmGM2JGe7Y9yVGokt4f3UqpT90laH31V70pbViSUrkO49OvvNq3QIhHKVt8tL5B8hTS5726Hd7GGPIsqw+4VAWBaHW7N09y4H9e5kYH0fpgKy0rHY6rKyvs97pUpYlSgjysmQsCfipu27n6KF9rK+ukBYF1hi63S69fkphKrRblDQYGRtjfGKCyclJ4jDElCUeX4WgdcfMOUuZZ2gl0Dpmo9jPjvYZpCivyj6N4en/h//y5D/83JcXPletkPRu29bZVqan5OTc/czPzVDmK5SlpbO2iq3XTQlBxX7iqU94TdYnBSrQFWFTWdIfDBikGWmWkWc5EofWknarRZrl5EWBEJIwTmi2WkRhQBInhFFYw1mq1LMsCkxZ1n3jalHcqx9RkhA1mqjGbvbuvMCNu76ON/9+puhHrrO92gudq2ZLSac/y3Mv3YvJN0gHA3obG+R5XsXtNbGqklU4ySZk5ApsUAhR9YGlRGtNEIYgJINBn363R1Hk6CAgjmPiOEKril/UlCVCiM3B7CpZk5iieCUwt/5+hX5x1QRO3VtutCdRjWnefPPXaSeX8O7PVyP6UQud1au3vA0yO3jiubUnfv7dsz/fTFTTWG/+rOZIVNkGL52+jbVlS1mmpIOUjfW1ivHKg7MOKWW1LbV2ktbaynbXA9Wy5gQa9nad91hrqsZLWDXskzgmDEOcc1hrKMuyfnfDdqWs4+9Kod5Vv3dIjVlxf7hqdKwskEphihLnDNZqStrsmjxf8QSJP/9K85/5O0//zKmLg1PDTXqblufVjkJJoeYWs7mvPLnylXfcM/GO6fFw2lhvXqtjrkyPYXV9By8f30merpKlOemgT1473U0KSymxptqWN6QuM9ZuDnJ772rhVMAqV0c2toasVHa8rE96JchqXkAS1OhoFVQNfLnJtFgp1dUKddbirME7T55nFW2ODiiLHFxBN59gx2SfRtzBO/WalFCNvnmrldAnzvdPfOi/euZDTx3rPDW0+1ufq/6kFysp1MXF7OJnvjT/mTtuHL3j8L7mYSEQr1URQsKLJw+xsmTJ0h55ntMf9DdPdT2cXk3LbFlRa+uopWJNka8uYNUErK4WNJso500E3SafkN/ctErNyGWt2aSl2aq0YSZeRWWVI69BkeT5AOdDRDDK7uk5cPJPVcBQ8EoKJaWQj3xr+ZGH/tZTD528MDg5XBf56teoH/aDlBSqn9n+p744/ymBEPffMXZ/oGXwpyliiPFZ70zw4su7KPIuRVFU+yDTFKXkpimh3pbqvasRzBLrKhMk6mx4+McM2XChInMSW/GgsHlLvHcghiyM5WbyhafKK8pyk6Fr82cMSZ2EoMizTXJZjycvcvCGzO5g944ucdTF1wN+f5rgi9IV/+gTp/7Rr/4Pz/9qmrv0hwn/hypg+EOHqI+vPrX61d//6uLvJ5FMbj04cmugRTAUvnXeMmSpRQihHceO7+fSvCPPu+R5iR3aX6A0hqI0r7D3RQ05MXVhbohmNrYyNUqqGu0MSmmsMRhTYooCayzWVTF/5Ueq0y6FRGqNq8eSXJ2QSXkF0FvkGc67TQRdXmSbpnFYnXe2wPmYIBlh5/QlsGpYUfbO46QQsnI1QpbGl5/8wtwnf+Xh53/l9x679HtD+Tn/w2eaXpNb2arBWw62bvnYB3Z/7MPvnv3w9bsb178y8rF0eyN85es3sNFZZZBW7CjOOayvzEZlAhy+Dusk1fpxXZOueu8Jggrh4Gpqy+FqEoSoVptYVzNv1fO9uipJOF993XtfN+i3IOTqm1KZSIkSosId1R017yp/MkTaDf2FdRYVNGjv2MN773+OVrKOd6+clj89Nzj92ccvf/aTX5j75Aunei+8WmY/MmB5rXtwBYjhD23EqnH3zaN3P3j/9INHj7SP7tvZ2H/jDfHhZ7+/Tzz/XIKxXbK8wFhLaYpqNk5Q0cKUdnPZsqwZHIZxcDUuWrFmSVUpAu/rkaIqo/V+k8BsC0Jd/AlvyG+BKQ7vlgcvqsaLqP6/Puu1+aMuWetqiMNVu4p1cx9339Xn9hte8C+fKo6fvzQ49+SxzpOPfHPpkadf3Hh6kNnBUPBVYPXaluP+/yLFZ6rsoazfAAAAAElFTkSuQmCC";
  var VERSION = "0.1.2";
  var CHANGELOG = [
    { v: "0.1.2", d: "2026-11-18", items: [
      "레슨 34개 추가 (총 156개) — 13개 노선 전부, 특히 ZFS·Exadata·보안·Data Guard 보강",
      "아키텍처: Oracle Net 설정 파일, 딕셔너리 뷰 읽는 법 / 공간: Smallfile·Bigfile 한도, LOB 세그먼트 / 백업: 증분·BCT, RMAN 속도 올리기",
      "RAC: SCAN·VIP 접속 흐름, 인터커넥트 점검, CTSS·chrony / ASM: OFFLINE·DISK_REPAIR_TIME, 디스크그룹 속성 / 패치: OPatch 업데이트, 충돌 확인·Merge 패치",
      "성능: 대기 이벤트 사전 20개, Resource Manager / 보안: 기본 비밀번호·스키마 전용 계정, 네트워크 암호화, 보안 진단 대응표 / DG: Switchover, 보호 모드",
      "Exadata: 셀 롤링 재기동(asmdeactivationoutcome), Storage Index·HCC, ILOM 장애 확인, 네트워크 구성 / ZFS: 백업 쉐어 권장 설정, 장애 CLI, ZFS vs ZDLRA, 백업 느릴 때",
      "장애: ORA-04031, listener.log 분석, 'DB 느려요' 5분 점검 / 이관: Data Pump 모니터링, XTTS, GoldenGate",
      "퀴즈 대폭 추가, 약어 사전 확장"] },
    { v: "0.1.1", d: "2026-11-18", items: [
      "SQL 실습 21문제 추가 (총 60문제) — 재귀 WITH, RANK, LAG, NOT IN의 NULL 함정, 비중(%), 피벗",
      "DBA 실습: 리두 멤버, 시간대별 아카이브, Standby 적용, FRA vs 디스크그룹, 잊힌 GRP, 휴지통, 세션·프로세스 한도, ORA-01555 구간, Undo 크기 계산, TEMP 사용 세션, 인덱스 없는 FK, UNUSABLE 인덱스, 오래된 통계",
      "실습 뷰 추가: V$LOGFILE, V$ARCHIVED_LOG, V$RECOVERY_FILE_DEST, V$RECOVERY_AREA_USAGE, V$RESTORE_POINT, (G)V$RESOURCE_LIMIT, V$UNDOSTAT, (G)V$TEMPSEG_USAGE, DBA_RECYCLEBIN, DBA_INDEXES, DBA_IND_COLUMNS, DBA_CONSTRAINTS, DBA_CONS_COLUMNS, DBA_TAB_STATISTICS",
      "레슨 6개 추가 (총 122개): 리두 그룹·멤버 관리, 휴지통·Flashback Drop, FRA 모니터링, 통계 관리(DBMS_STATS), Redo 전송·적용 확인, ORA-01652 TEMP 부족",
      "퀴즈 추가 (총 250문제 이상), 결과 0행일 때 채점 안내 개선"] },
    { v: "0.1.0", d: "2026-11-18", items: [
      "레슨 31개 추가 (총 116개) — 13개 노선 모두 보강",
      "아키텍처: SGA 구성요소, PGA 작업공간, 접속 흐름, 파라미터 변경 범위 / 공간: UNDO 심화, TEMP 관리, 데이터파일 온라인 이동, 파티셔닝",
      "백업: 컨트롤파일 기록 보존·Recovery Catalog, 블록 손상 복구, DUPLICATE / RAC: Clusterware 로그, TAF·FAN·AC / ASM: udev·ASMLib·AFD, ACFS",
      "패치: 패치 후 점검·롤백 판단, OJVM / 성능: SQL Monitor, 바인드·하드 파싱, 액세스 경로 / 보안: TDE, 비밀번호 검증·잠금 대응",
      "Data Guard: Snapshot Standby, Active Data Guard / Exadata: EXAchk, Flash Cache·IORM / 장애: 세션 한도, 데드락, 노드 재부팅 점검 / 이관: non-CDB→PDB, 타임존",
      "퀴즈 46문제 추가 (총 201문제), 약어 사전 14개 추가 (총 124개)"] },
    { v: "0.0.9", d: "2026-11-18", items: [
      "🚚 13호선 '업그레이드·이관' 신설: 방법 고르기, AutoUpgrade 따라하기, 롤백 계획(GRP·COMPATIBLE), RMAN 백업셋으로 옮기며 업그레이드, Data Pump 실무 옵션, 콜드 백업 이관",
      "패치: 비활성 패치 정리(opatch util deleteinactivepatches) / 아키텍처: 19c에서 달라진 것들 / RAC: Linux 8·9에 19c 설치 체크포인트",
      "실무 참고 블로그 '내맘대로긍정'(positivemh.tistory.com) 글을 관련 레슨의 근거 링크로 연결",
      "퀴즈 29문제 추가 (총 155문제) — 장애대응·Data Guard·보안·공간·ASM·성능·RAC 노선 보강",
      "약어 사전에 GIMR·ADG·SE2·EE 추가 (총 110개)"] },
    { v: "0.0.8", d: "2026-11-17", items: [
      "노선별 레슨 18개 추가 (총 76개)·퀴즈 26문제 추가 (총 126문제)",
      "공간관리: 큰 세그먼트·리사이클빈 / 백업·복구: 백업 검증과 정리, Flashback Database와 보장 복원 지점",
      "RAC: 인스턴스 롤링 재기동, OCR·Voting Disk·OLR 백업 / ASM: 디스크 추가·교체, ASM 인스턴스 점검",
      "보안: PUBLIC·ANY 권한 점검, sqlnet.ora 접속 통제 / Data Guard: Failover와 Reinstate, 상태 점검 쿼리",
      "성능: SQL Plan Baseline, OS 자원 점검 / 패치: 패치 전 점검 체크리스트, datapatch 실패 대응",
      "장애대응: 접속 장애(ORA-12514·12541·12170), DB hang 진단(hanganalyze) / Exadata: 디스크 교체 흐름",
      "약어 사전에 GRP·OLR·AHF·TFA 추가"] },
    { v: "0.0.7", d: "2026-11-17", items: [
      "1호선 아키텍처에 'UPDATE 한 건의 여행' 레슨 11개 추가 (수재님 학습 노트 기반, 19c 문서와 대조해 보완)",
      "등장인물 비유 → STEP별 내부 동작(파싱·블록 확보·잠금·Undo/Redo·커밋) → SELECT와 읽기 일관성 → 인스턴스 복구와 Write-Ahead",
      "캐시 3종, 더티 버퍼와 LGWR·DBWn 쓰기 시점, 로그 스위치 vs 체크포인트, Redo Log 그룹 상태·관리, SCN, COMMIT_LOGGING·COMMIT_WAIT, 랩 실습 SQL",
      "노트 보완: 잠금(TX·TM) 단계 추가, Undo 변경도 Redo로 보호됨, SELECT도 지연 블록 정리로 Redo가 생길 수 있음, LOG_CHECKPOINTS_TO_ALERT 기본 FALSE, ORA_ROWSCN 블록 단위",
      "아키텍처 퀴즈 14문제 추가 (총 100문제), 약어 사전에 RBA·OMF·ACID·2PC 추가"] },
    { v: "0.0.6", d: "2026-11-17", items: [
      "설치형 앱의 AI 기본값을 무료 방식으로 변경: 질문을 Claude(claude.ai·Claude 앱)로 넘겨 내 Claude 계정(Pro)으로 답 받기 — 추가 결제 없음",
      "AI 튜터·레슨 질문·퀴즈 해설·SQL 코칭 버튼 모두 같은 방식으로 동작, 질문은 클립보드에도 복사",
      "SQL 코칭을 Claude로 넘길 때는 모범 답안을 넣지 않음 (질문 화면에 그대로 보이므로)",
      "API 키는 '선택·유료' 고급 옵션으로 이동 — 넣지 않으면 비용 0원"] },
    { v: "0.0.5", d: "2026-11-17", items: [
      "🤖 AI 튜터 추가: 자유 질문, 대화 이어서 묻기, 메모 붙여넣고 검토받기, 자주 묻는 질문 버튼",
      "좋은 답변은 '📌 노트에 저장' → 노트 탭 📌 AI에서 다시 보기 (학습 기록 백업에 함께 포함)",
      "설치형 앱에서도 AI 사용: ⚙️ 설정에 내 Claude API 키를 넣으면 AI 튜터·레슨 질문·퀴즈 해설·SQL 코칭·AI 문제 생성이 모두 동작",
      "API 키는 이 기기에만 저장 (GitHub·백업·동기화에 포함 안 됨), 질문할 때만 토큰 사용",
      "AI 모델 선택(Sonnet 5.5 정확도 우선 / Haiku 5.5 저렴), 이번 달 사용량·추정 비용 표시, 연결 테스트",
      "claude.ai에서 열면 기존처럼 Claude 계정으로 동작 — 같은 코드로 두 곳 모두 지원"] },
    { v: "0.0.4", d: "2026-11-17", items: [
      "약어 풀이: 레슨·퀴즈·SQL 문제에서 약어가 처음 나올 때 LGWR(Log Writer), SGA(System Global Area)처럼 풀어서 표시",
      "백그라운드 프로세스 이름은 Oracle Database Reference의 Background Processes 표 기준 (PMON·SMON·DBWn·LGWR·CKPT·ARCn·LREG·CLMN·MMON·LMS·LMD·LMON·RFS·MRP0 등)",
      "학습 탭에 📖 약어 사전 추가: 98개 약어를 분야별로 정리, 검색 가능",
      "같은 약어가 노선마다 뜻이 다르면 구분 (MRP: 패치=Monthly Recommended Patches, Data Guard=Managed Recovery Process)",
      "설정 ⚙️에서 약어 풀이 켜기/끄기 (퀴즈를 실력 점검용으로 풀 때는 끄기)",
      "GitHub Pages 설치형 배포 시작 (dbbig-0118.github.io)"] },
    { v: "0.0.3", d: "2026-11-17", items: [
      "앱 아이콘을 수재님 아바타로 변경 (헤더 로고·브라우저 탭 아이콘)",
      "10호선 Exadata를 X11M-Z 기준으로 개편: 'X11M-Z 하드웨어 한눈에' 레슨 신설(DB 서버-Z·HC-Z 스토리지 사양, 최소 구성, quorum disk)",
      "Exadata 핵심 기능에 XRMEM·Exascale·Smart Scan 통계 해석 추가, Exadata System Software 24.1~26.x 버전 정리",
      "지원 버전 문서 표기를 KB153930(구 MOS 888828.1)로 갱신",
      "11호선 ZFS Storage(ZS11-2) 신설: 하드웨어, 풀 프로파일, 프로젝트·쉐어 CLI, dNFS·RMAN 백업, 클러스터 takeover/failback — 레슨 5개·퀴즈 8문제",
      "장애대응 노선은 12호선으로 이동",
      "RAC 서비스: 19c -failback YES, relocate -drain_timeout, -newinst 미검증 주의(MOS 3030680.1) 보충",
      "근거 문서 링크 35개 레슨으로 확대, 퀴즈 총 86문제"] },
    { v: "0.0.2", d: "2026-11-17", items: [
      "Oracle 19c 공식 문서·MOS 노트와 대조해 레슨 내용 검증·수정",
      "19c 기준 수정: PMON→CLMN/CLnn 정리 위임, LGWR 기록 시점(로그 스위치·1MB), USE_LARGE_PAGES AUTO_ONLY",
      "패치: RUR 중단(19.16.2)·MRP 도입 시점, opatchauto rollback -switch-clone, patchmgr --repo 옵션",
      "ASM: FAILGROUP_REPAIR_TIME(24h), 19.16 GI RU REQUIRED_MIRROR_FREE_MB 계산 변경, 설정 확인 쿼리",
      "Exadata: 셀 종료 절차를 공식 문서 순서로 보완(CELL-01548 포함)",
      "Data Guard: SRL 추가 예시, V$MANAGED_STANDBY deprecated, RECOVER FROM SERVICE 주의점",
      "레슨 28개에 근거 문서(docs.oracle.com) 링크 추가",
      "퀴즈 8문제 추가 (총 73문제)",
      "앱 버전 표시와 업데이트 내역 화면 추가"] },
    { v: "0.0.1", d: "2026-11-17", items: ["첫 공개: 11개 노선 41개 레슨, 퀴즈 65문제, SQL 39문제, 실습 엔진, AI 코치, 듣기, 기록 동기화"] }
  ];

  /* ───────── 유틸 ───────── */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function md(s) { return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>"); }

  /* ───────── 약어 풀이 ─────────
     한 레슨·한 문제(=unit) 안에서 약어가 처음 나올 때만 "LGWR(Log Writer)"처럼 풀어 씀.
     이미 "약어(설명)" 또는 "설명(약어)" 형태로 적힌 곳은 건드리지 않고, 괄호 안이 다른 설명이면 그 앞에 끼워 넣음. */
  var GL = window.DBBIG_GLOSSARY || [], GLMAP = {};
  GL.forEach(function (e) { (e.m || [e.k]).forEach(function (f) { (GLMAP[f] = GLMAP[f] || []).push(e); }); });
  var GLRE = (function () {
    var forms = Object.keys(GLMAP).sort(function (a, b) { return b.length - a.length; });
    if (!forms.length) return null;
    return new RegExp("(^|[^A-Za-z0-9_$#<=.'\"\\-])(" + forms.join("|") + ")(?=$|[^A-Za-z0-9_$#>=.'\"\\-]|\\.(?![A-Za-z0-9]))", "g");
  })();
  function abOn() { return S.settings.abx !== false; }
  function abUnit(cat) { return { cat: cat ? cat.id : null, seen: {}, ins: [] }; }
  function abPick(form, u) {
    var l = GLMAP[form] || [];
    for (var i = 0; i < l.length; i++) if (!l[i].c || (u.cat && l[i].c.indexOf(u.cat) >= 0)) return l[i];
    return null;
  }
  function abHas(text, e) { text = text.toLowerCase(); return text.indexOf(e.f.toLowerCase()) >= 0; }
  function abx(s, u) {
    if (s == null) return "";
    s = String(s);
    if (!u || !GLRE || !abOn()) return s;
    var parts = s.split("`");
    for (var i = 0; i < parts.length; i += 2) {
      var seg = parts[i];
      parts[i] = seg.replace(GLRE, function (all, pre, tok, off) {
        var e = abPick(tok, u); if (!e || u.seen[e.k]) return all;
        var fl = e.f.toLowerCase();
        // 바로 앞에서 같은 풀이를 이미 넣었으면(예: LMS의 Global Cache Service → GCS) 생략
        for (var j = 0; j < u.ins.length; j++) if (u.ins[j].indexOf(fl) >= 0) { u.seen[e.k] = 1; return all; }
        var at = off + all.length, nx = seg.charAt(at);
        if (nx === "(") {                       // 약어(…)
          var close = seg.indexOf(")", at), inner = seg.slice(at + 1, close < 0 ? seg.length : close);
          if (abHas(inner, e)) { u.seen[e.k] = 1; return all; }          // 이미 풀이가 있음
          if (GLMAP[inner.trim()] || /[=_'"]/.test(inner)) return all;      // Direct NFS(dNFS), RU(PATCH_TYPE='RU') 같은 경우는 건드리지 않음
          u.seen[e.k] = 1; u.ins.push(fl);
          return pre + tok + "\u0003" + e.f + "\u0004";             // 괄호 안 맨 앞에 끼워 넣기
        }
        if (pre === "(" && abHas(seg.slice(Math.max(0, off - 60), off), e)) { u.seen[e.k] = 1; return all; }  // 풀이(약어)
        u.seen[e.k] = 1; u.ins.push(fl);
        if (pre === "(" && nx === ")") return pre + tok + "\u0001, " + e.f + "\u0002";
        return pre + tok + "\u0001(" + e.f + ")\u0002";
      }).replace(/\u0003([^\u0004]*)\u0004\(/g, "(\u0001$1, \u0002");
    }
    return parts.join("`");
  }
  function mdx(s, u) { return md(abx(s, u)).replace(/\u0001/g, '<span class="abx">').replace(/\u0002/g, "</span>"); }
  function today(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }
  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); })]); }

  /* ───────── 상태 ───────── */
  var KEY = "dbbigsql.v1", DKEY = "dbbigsql.drafts";
  function blank() { return { v: 1, lessons: {}, quiz: {}, wrong: {}, sql: {}, days: {}, saved: [], settings: { theme: "auto", fs: 1, goalQ: 10 }, updatedAt: 0 }; }
  function normalize(s) { var b = blank(); if (!s || s.v !== 1) return b; Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; }); s.settings = Object.assign(b.settings, s.settings || {}); return s; }
  var S = (function () { try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return blank(); } })();
  var DR = (function () { try { return JSON.parse(localStorage.getItem(DKEY)) || {}; } catch (e) { return {}; } })();
  function save() { S.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} cloudSave(); }
  function saveDraft(k, v) { DR[k] = v; try { localStorage.setItem(DKEY, JSON.stringify(DR)); } catch (e) {} }
  function bump(kind, n) { var d = today(); var o = S.days[d] || (S.days[d] = { l: 0, q: 0, s: 0 }); o[kind] = (o[kind] || 0) + (n || 1); }
  function merge(a, b) { // 두 기기 기록 병합
    var r = normalize(JSON.parse(JSON.stringify(a.updatedAt >= b.updatedAt ? a : b))), o = a.updatedAt >= b.updatedAt ? b : a;
    Object.keys(o.lessons || {}).forEach(function (k) { if (!r.lessons[k]) r.lessons[k] = o.lessons[k]; });
    Object.keys(o.sql || {}).forEach(function (k) { var x = r.sql[k], y = o.sql[k]; if (!x) r.sql[k] = y; else { x.tries = Math.max(x.tries || 0, y.tries || 0); if (!x.solved && y.solved) x.solved = y.solved; } });
    Object.keys(o.quiz || {}).forEach(function (k) { var x = r.quiz[k], y = o.quiz[k]; if (!x) r.quiz[k] = y; else { x.c = Math.max(x.c, y.c); x.w = Math.max(x.w, y.w); } });
    Object.keys(o.days || {}).forEach(function (k) { var x = r.days[k], y = o.days[k]; if (!x) r.days[k] = y; else ["l", "q", "s"].forEach(function (f) { x[f] = Math.max(x[f] || 0, y[f] || 0); }); });
    var sv = {}; (r.saved || []).concat(o.saved || []).forEach(function (x) { if (x && x.ts) sv[x.ts] = x; });
    r.saved = Object.keys(sv).map(function (k) { return sv[k]; }).sort(function (x, y) { return y.ts - x.ts; }).slice(0, 60);
    r.updatedAt = Math.max(a.updatedAt, b.updatedAt);
    return r;
  }

  /* ───────── 클라우드 동기화 (claude db, 사용자별 비공개) ───────── */
  var cloud = { ref: null, timer: null, busy: false, dirty: false, on: false };
  function cloudSave() { if (!cloud.ref) return; clearTimeout(cloud.timer); cloud.timer = setTimeout(flush, 2500); }
  function flush() {
    if (!cloud.ref) return;
    if (cloud.busy) { cloud.dirty = true; return; }
    cloud.busy = true;
    cloud.ref.set({ state: JSON.stringify(S), updatedAt: S.updatedAt }).then(function () { cloud.on = true; }, function (e) {
      if (e && (e.code === "invalid_argument" || e.code === "revoked" || e.code === "not_granted" || e.code === "quota_exceeded")) { cloud.ref = null; cloud.on = false; renderTop(); }
    }).then(function () { cloud.busy = false; if (cloud.dirty) { cloud.dirty = false; flush(); } });
  }
  function initCloud() {
    var c = window.claude; if (!c || !c.use) return;
    Promise.all([c.use("db"), c.use("user")]).then(function (r) {
      var db = r[0], user = r[1]; if (!db || !user) return null;
      return user.id().then(function (id) {
        if (!id) return null;
        cloud.ref = db.doc("data/users/" + id + "/progress");
        return withTimeout(cloud.ref.get(), 10000).then(function (snap) {
          cloud.on = true;
          var remote = null;
          if (snap && snap.exists) { try { remote = normalize(JSON.parse((snap.data() || {}).state)); } catch (e) { remote = null; } }
          if (remote && remote.updatedAt) {
            var before = JSON.stringify(S), m = merge(S, remote); S = m;
            try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
            if (JSON.stringify(S) !== before) { applyTheme(); render(); if (remote.updatedAt > 0) toast("다른 기기의 학습 기록과 동기화했어요"); }
            if (m.updatedAt !== remote.updatedAt || JSON.stringify(remote) !== JSON.stringify(m)) flush();
          } else if (S.updatedAt) flush();
          renderTop();
        });
      });
    }).catch(function () { cloud.ref = null; cloud.on = false; });
  }

  /* ───────── AI / TTS ─────────
     claude.ai에서 열면 Claude 계정(sample), 설치형(GitHub Pages)에서는 내 API 키로 Anthropic API를 직접 호출.
     API 키와 사용량은 이 기기 localStorage에만 저장 — 학습 기록 백업·동기화에 포함하지 않음. */
  var AI = null, AIMODE = "", TTS = null, speaking = false, synthUtter = null;
  var AKEY = "dbbigsql.apikey", AUKEY = "dbbigsql.apiusage";
  var MODELS = [["claude-sonnet-5-5", "Sonnet 5.5", 2, 10, "정확도 우선"], ["claude-haiku-5-5", "Haiku 5.5", 0.1, 0.5, "저렴·빠름"]];
  function apiKey() { try { return localStorage.getItem(AKEY) || ""; } catch (e) { return ""; } }
  function apiModel() { for (var i = 0; i < MODELS.length; i++) if (MODELS[i][0] === S.settings.aiModel) return MODELS[i]; return MODELS[0]; }
  function apiUsage() { var u; try { u = JSON.parse(localStorage.getItem(AUKEY)) || {}; } catch (e) { u = {}; } var mk = today().slice(0, 7); if (u.m !== mk) u = { m: mk, i: 0, o: 0, n: 0, usd: 0 }; return u; }
  function addUsage(model, inp, out) { var u = apiUsage(); u.i += inp; u.o += out; u.n += 1; u.usd += (inp * model[2] + out * model[3]) / 1e6; try { localStorage.setItem(AUKEY, JSON.stringify(u)); } catch (e) {} }
  function aiError(code, msg) { var e = new Error(msg); e.code = code; e.msg = msg; return e; }
  function apiErr(status, b) {
    var t = (b && b.error && b.error.type) || "", m = (b && b.error && b.error.message) || "";
    if (/credit balance/i.test(m)) return aiError("api", "API 크레딧이 부족해요. Claude Console에서 크레딧을 충전해 주세요.");
    if (status === 401) return aiError("api", "API 키가 올바르지 않아요. ⚙️ 설정에서 키를 다시 확인해 주세요.");
    if (status === 403) return aiError("api", "이 API 키로는 사용할 수 없어요(권한 없음).");
    if (status === 429) return /spend|usage limit|threshold/i.test(m) ? aiError("api", "API 월 사용 한도에 도달했어요. Console의 Spend limits를 확인해 주세요.") : aiError("rate_limited", "요청이 많아요. 잠시 후 다시 시도해 주세요.");
    if (status === 529 || t === "overloaded_error") return aiError("api", "AI 서버가 붐벼요. 잠시 후 다시 시도해 주세요.");
    if (status === 400) return aiError("api", "요청을 처리하지 못했어요: " + m.slice(0, 140));
    return aiError("api", "AI 응답을 받지 못했어요 (" + status + ").");
  }
  // messages: [{role:"user"|"assistant", content:"..."}], opts: {system, onText, maxTokens}
  function apiCall(messages, opts) {
    opts = opts || {};
    var key = apiKey(), model = apiModel();
    if (!key) return Promise.reject(aiError("nokey", "⚙️ 설정에서 Claude API 키를 먼저 넣어 주세요."));
    if (navigator.onLine === false) return Promise.reject(aiError("offline", "인터넷 연결이 없어요. AI 질문은 온라인에서만 돼요."));
    var body = { model: model[0], max_tokens: opts.maxTokens || 4096, messages: messages, stream: true };
    if (opts.system) body.system = opts.system;
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) return res.json().catch(function () { return null; }).then(function (b) { throw apiErr(res.status, b); });
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "", text = "", inp = 0, out = 0, err = null;
      function handle(ev) {
        if (ev.type === "message_start" && ev.message && ev.message.usage) { var u = ev.message.usage; inp = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0); }
        else if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") { text += ev.delta.text; if (opts.onText) opts.onText({ text: text }); }
        else if (ev.type === "message_delta" && ev.usage) out = ev.usage.output_tokens || out;
        else if (ev.type === "error") err = apiErr(ev.error && ev.error.type === "overloaded_error" ? 529 : 500, ev);
      }
      function eat(chunk) { chunk.split("\n").forEach(function (line) { if (line.indexOf("data:") === 0) { try { handle(JSON.parse(line.slice(5).trim())); } catch (e) {} } }); }
      function pump() {
        return reader.read().then(function (r) {
          if (r.value) buf += dec.decode(r.value, { stream: true }).replace(/\r/g, "");
          var parts = buf.split("\n\n"); buf = parts.pop(); parts.forEach(eat);
          if (!r.done) return pump();
          if (buf.trim()) eat(buf);
          if (inp || out) addUsage(model, inp, out);
          if (err && !text) throw err;
          return { text: text, usage: { input: inp, output: out } };
        });
      }
      return pump();
    }, function () { throw aiError("net", "AI 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요."); });
  }
  function apiAI(prompt, opts) { return apiCall([{ role: "user", content: prompt }], { onText: opts && opts.onText, system: opts && opts.system }); }
  apiAI.json = function (prompt) {
    return apiCall([{ role: "user", content: prompt }], {}).then(function (r) {
      var m = r.text.match(/\{[\s\S]*\}/); if (!m) throw aiError("api", "AI가 형식에 맞는 답을 주지 않았어요.");
      return JSON.parse(m[0]);
    });
  };
  /* 무료 방식(설치형 기본): 질문을 Claude(claude.ai·Claude 앱)로 넘겨서 내 Pro/Free 계정으로 답을 받음.
     질문은 클립보드에도 복사 — 링크로 미리 채워지지 않으면 붙여넣기만 하면 됨. */
  var HANDOFF_URL = "https://claude.ai/new", HANDOFF_MAXENC = 7000;
  function handoff(text) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (e) {}
    var enc = encodeURIComponent(text), fits = enc.length <= HANDOFF_MAXENC;
    var w = null; try { w = window.open(HANDOFF_URL + (fits ? "?q=" + enc : ""), "_blank"); if (w) w.opener = null; } catch (e) {}
    toast(!w ? "팝업이 막혔어요. Claude 앱을 열고 붙여넣기 해 주세요 (질문은 복사됨)" : fits ? "Claude로 질문을 넘겼어요 · 클립보드에도 복사됨" : "질문이 길어서 클립보드에 복사했어요. Claude에서 붙여넣기 해 주세요");
    return fits;
  }
  function handoffAI(prompt) { var fits = handoff(prompt); return Promise.resolve({ text: "", handoff: true, prefilled: fits }); }
  handoffAI.json = function () { return Promise.reject(aiError("handoff", "이 기능은 앱 안에서 답을 받아야 해서 API 키가 있을 때만 돼요.")); };
  function useApiAI() { if (AIMODE === "claude") return; if (apiKey()) { AI = apiAI; AIMODE = "api"; } else if (!(window.claude && window.claude.use)) { AI = handoffAI; AIMODE = "handoff"; } else { AI = null; AIMODE = ""; } }
  function initCaps() {
    var c = window.claude;
    if (!c || !c.use) { useApiAI(); return; }
    c.use("sample").then(function (s) { if (s) { AI = s; AIMODE = "claude"; render(); } });
    c.use("tts").then(function (t) { TTS = t; if (t) { t.onState(function (st) { speaking = st.state === "speaking" || st.state === "paused"; syncSpeakBtn(); }); } });
  }
  // 대화형 호출: history = [{r:"u"|"a", t:"..."}]
  function aiChat(history, system, onText) {
    if (AIMODE === "api") return apiCall(history.map(function (m) { return { role: m.r === "u" ? "user" : "assistant", content: m.t }; }), { system: system, onText: onText });
    var last = history[history.length - 1], prev = history.slice(0, -1);
    var prompt = system + (prev.length ? "\n\n[이전 대화]\n" + prev.map(function (m) { return (m.r === "u" ? "학습자: " : "튜터: ") + m.t; }).join("\n\n") : "") + "\n\n[학습자 질문]\n" + last.t;
    return AI(prompt, { modelTier: "default", cache: false, onText: onText });
  }
  function aiFail(e) { return e && e.msg ? e.msg : e && e.code === "rate_limited" ? "요청이 많아요. 잠시 후 다시 시도해 주세요." : e && e.code === "not_granted" ? "AI 사용이 허용되지 않았어요." : "AI 응답을 받지 못했어요."; }
  function aiAsk(prompt, box, opts) {
    if (!AI) return;
    if (AIMODE === "handoff") {
      var fits = handoff(prompt); box.style.display = "block";
      box.innerHTML = '<div class="h">🤖 Claude로 넘겼어요</div><div class="b small">' + (fits ? "Claude에 질문이 채워져 있으면 보내기만 누르세요." : "질문이 길어서 링크에 다 담지 못했어요. Claude 입력창에 <b>붙여넣기</b> 하세요.") + ' 내 Claude 계정(Pro)으로 답하니 추가 비용은 없어요. 열리지 않으면 Claude 앱을 직접 열고 붙여넣기 하세요(클립보드에 복사됨).</div>';
      return;
    }
    box.style.display = "block";
    box.innerHTML = '<div class="h">🤖 AI 코치</div><span class="spin"></span> 생각하는 중…';
    var body = null;
    AI(prompt, Object.assign({ modelTier: "default", cache: false, onText: function (u) { if (!body) { box.innerHTML = '<div class="h">🤖 AI 코치</div><div class="b"></div>'; body = box.querySelector(".b"); } body.innerHTML = md(u.text); } }, opts || {}))
      .then(function (r) { if (!body) box.innerHTML = '<div class="h">🤖 AI 코치</div><div class="b">' + md(r.text) + "</div>"; box.insertAdjacentHTML("beforeend", '<div class="dim small" style="margin-top:8px">AI 답변은 틀릴 수 있어요. 중요한 내용은 Oracle 공식 문서로 교차 확인하세요.</div>'); })
      .catch(function (e) { box.innerHTML = '<div class="h">🤖 AI 코치</div>' + esc(aiFail(e)); if (e && e.code === "not_granted") { AI = null; } });
  }
  function lessonSpeech(l) {
    var lines = [l.title + "."];
    l.body.forEach(function (b) {
      if (b[0] === "p" || b[0] === "tip" || b[0] === "warn") lines.push((b[0] === "tip" ? "실무 팁. " : b[0] === "warn" ? "주의. " : "") + b[1]);
      else if (b[0] === "ul") lines.push(b[1].join(". "));
      else if (b[0] === "tbl") lines.push(b[1].slice(1).map(function (r) { return r.join(", "); }).join(". "));
    });
    return lines.map(function (t) { return t.replace(/[<>→←]/g, " ").replace(/\s+/g, " ").slice(0, 1900); });
  }
  function speak(l) {
    if (speaking) { stopSpeak(); return; }
    var lines = lessonSpeech(l);
    if (TTS) {
      speaking = true; syncSpeakBtn();
      TTS.speak(lines.map(function (t) { return { text: t, language: "ko" }; }), { rate: S.settings.rate || 1 }).catch(function () {}).then(function () { speaking = false; syncSpeakBtn(); });
      return;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel(); speaking = true; syncSpeakBtn();
        lines.forEach(function (t, i) {
          var u = new SpeechSynthesisUtterance(t); u.lang = "ko-KR"; u.rate = S.settings.rate || 1;
          if (i === lines.length - 1) u.onend = function () { speaking = false; syncSpeakBtn(); };
          u.onerror = function () { speaking = false; syncSpeakBtn(); };
          window.speechSynthesis.speak(u);
        });
      } catch (e) { speaking = false; toast("이 기기에서는 듣기 기능을 쓸 수 없어요"); }
    }
  }
  function stopSpeak() { speaking = false; try { if (TTS) TTS.stop(); } catch (e) {} try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} syncSpeakBtn(); }
  function canSpeak() { return !!(TTS || window.speechSynthesis); }
  function syncSpeakBtn() { var b = $("#spk"); if (b) b.innerHTML = speaking ? "⏹ 정지" : "🎧 듣기"; }

  /* ───────── SQL 엔진 로딩 ───────── */
  var engine = null, engineP = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function getEngine() {
    if (engine) return Promise.resolve(engine);
    if (engineP) return engineP;
    // sql.js (SQLite, asm.js 빌드) — 외부 fetch 없이 스크립트만으로 동작
    var SRC = ["sql-asm.js", "https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-asm.js"];  // 설치형: 앱에 포함된 엔진 우선(오프라인)
    var tryLoad = function (i) { return loadScript(SRC[i]).then(function () { if (!window.initSqlJs) throw new Error("no initSqlJs"); }, function (e) { if (i + 1 < SRC.length) return tryLoad(i + 1); throw e; }); };
    engineP = tryLoad(0).then(function () { return window.initSqlJs(); })
      .then(function (SQL) { engine = new EN.Engine(SQL, window.DBBIG_SCHEMA); return engine; })
      .catch(function (e) { engineP = null; throw e; });
    return engineP;
  }

  /* ───────── 아이콘 ───────── */
  var IC = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/></svg>',
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 8"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7"/><circle cx="12" cy="16.8" r=".6" fill="currentColor"/></svg>',
    sql: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V5.5"/><path d="M4.5 12v6.5c0 1.5 3.4 2.8 7.5 2.8"/><path d="m16 17 2 2 4-4"/></svg>',
    notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h9l3.5 3.5V20.5H6z"/><path d="M14.5 3.5V7.5h4"/><path d="M9 12h6M9 15.5h6"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };

  /* ───────── 라우팅 ───────── */
  var R = { name: "home", arg: null };
  function parseRoute() {
    var h = (location.hash || "").replace(/^#/, "") || "home", m;
    if ((m = h.match(/^line-(\w+)$/))) return { name: "line", arg: m[1] };
    if ((m = h.match(/^lesson-([\w-]+)$/))) return { name: "lesson", arg: m[1] };
    if ((m = h.match(/^sql-(\w+)$/))) return { name: "prob", arg: m[1] };
    if (["home", "learn", "quiz", "quizrun", "sql", "sandbox", "notes", "glossary", "tutor"].indexOf(h) >= 0) return { name: h, arg: null };
    return { name: "home", arg: null };
  }
  function go(h) { if (location.hash === "#" + h) { render(); window.scrollTo(0, 0); } else location.hash = h; }
  window.addEventListener("hashchange", function () { stopSpeak(); render(); window.scrollTo(0, 0); });
  function tabOf(n) { return { home: "home", learn: "learn", line: "learn", lesson: "learn", glossary: "learn", quiz: "quiz", quizrun: "quiz", sql: "sql", prob: "sql", sandbox: "sql", notes: "notes" }[n] || "home"; }

  /* ───────── 통계 ───────── */
  function streak() {
    var n = 0, d = new Date();
    var act = function (k) { var o = S.days[k]; return o && (o.l || o.q || o.s); };
    if (!act(today(d))) d.setDate(d.getDate() - 1);
    while (act(today(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function dayGoal() {
    var o = S.days[today()] || { l: 0, q: 0, s: 0 }, gq = S.settings.goalQ || 10;
    var parts = [Math.min(1, (o.l || 0) / 1), Math.min(1, (o.q || 0) / gq), Math.min(1, (o.s || 0) / 1)];
    return { o: o, gq: gq, pct: (parts[0] + parts[1] + parts[2]) / 3 };
  }
  function catProgress(c) { var d = c.lessons.filter(function (l) { return S.lessons[l.id]; }).length; return { d: d, n: c.lessons.length }; }
  function quizAcc(qs) { var c = 0, w = 0; qs.forEach(function (q) { var r = S.quiz[q.id]; if (r) { c += r.c; w += r.w; } }); return c + w ? Math.round(c / (c + w) * 100) : null; }
  function wrongList() { return Object.keys(S.wrong).filter(function (k) { return QBYID[k]; }).sort(function (a, b) { return S.wrong[b] - S.wrong[a]; }).map(function (k) { return QBYID[k]; }); }
  function solvedCount() { return P.filter(function (p) { return S.sql[p.id] && S.sql[p.id].solved; }).length; }
  function nextLesson() { for (var i = 0; i < LESSONS.length; i++) if (!S.lessons[LESSONS[i].id]) return LESSONS[i]; return null; }
  function dailyProblem() {
    var uns = P.filter(function (p) { return !(S.sql[p.id] && S.sql[p.id].solved); });
    var pool = uns.length ? uns : P; return pool[hashStr(today()) % pool.length];
  }

  /* ───────── 렌더 공통 ───────── */
  function renderTop() {
    var top = $("#top"), n = R.name, h = "";
    var titles = { line: function () { var c = catById(R.arg); return c ? c.no + "호선 · " + c.name : "학습"; }, lesson: function () { var l = lessonById(R.arg); return l ? l.cat.name : "레슨"; }, prob: function () { var p = PBYID[R.arg]; return p ? "SQL 문제 · " + LVN[p.lv] : "SQL"; }, sandbox: function () { return "자유 실습"; }, glossary: function () { return "약어 사전"; }, tutor: function () { return "AI 튜터"; }, quizrun: function () { return QS ? QS.title : "퀴즈"; } };
    var backTo = { line: "learn", lesson: R.name === "lesson" && lessonById(R.arg) ? "line-" + lessonById(R.arg).cat.id : "learn", prob: "sql", sandbox: "sql", glossary: "learn", tutor: "home", quizrun: "quiz" };
    if (titles[n]) h += '<button class="back" data-go="' + backTo[n] + '" aria-label="뒤로">‹</button><div class="ttl">' + esc(titles[n]()) + "</div>";
    else h += '<div class="logo"><img class="mark" src="' + ICON + '" alt="" width="32" height="32"><span>디비빅<small>SQL</small></span></div>';
    h += '<div class="sp"></div>';
    var st = streak();
    if (!titles[n]) h += '<span class="chip fire" title="연속 학습일">🔥 ' + st + "일</span>";
    if (n !== "tutor") h += '<button class="iconbtn" data-go="tutor" aria-label="AI 튜터" style="font-size:19px">🤖</button>';
    h += '<button class="iconbtn" data-act="settings" aria-label="설정">' + IC.gear + "</button>";
    top.innerHTML = h;
    var tabs = [["home", "홈"], ["learn", "학습"], ["quiz", "퀴즈"], ["sql", "SQL"], ["notes", "노트"]], cur = tabOf(n), wc = wrongList().length;
    $("#tabs").innerHTML = tabs.map(function (t) {
      return '<button class="tab' + (t[0] === cur ? " on" : "") + '" data-go="' + t[0] + '">' + IC[t[0]] + (t[0] === "notes" && wc ? '<span class="dot">' + (wc > 99 ? "99+" : wc) + "</span>" : "") + "<span>" + t[1] + "</span></button>";
    }).join("");
  }
  function catById(id) { for (var i = 0; i < C.length; i++) if (C[i].id === id) return C[i]; return null; }
  function lessonById(id) { for (var i = 0; i < LESSONS.length; i++) if (LESSONS[i].id === id) return LESSONS[i]; return null; }
  function badge(c, size) { return '<span class="badge" style="background:' + c.color + (size ? ";width:" + size + "px;height:" + size + "px" : "") + '">' + c.no + "</span>"; }

  function render() {
    R = parseRoute();
    applyTheme();
    renderTop();
    var m = $("#main"), f = V[R.name] || V.home;
    m.className = "fadein"; void m.offsetWidth;
    m.innerHTML = f(R.arg);
    if (A[R.name]) A[R.name](R.arg);
  }

  /* ───────── 화면 ───────── */
  var V = {}, A = {};

  V.home = function () {
    var g = dayGoal(), st = streak(), hr = new Date().getHours();
    var hi = hr >= 5 && hr < 11 ? "출근길 한 정거장, 시작해 볼까요?" : hr >= 11 && hr < 14 ? "점심시간 짧게 한 정거장!" : hr >= 17 && hr < 23 ? "퇴근길, 오늘 배운 걸 굳혀요." : "오늘도 한 정거장씩.";
    var R2 = 46, CIR = 2 * Math.PI * R2, off = CIR * (1 - g.pct);
    var h = '<h1>' + esc(hi) + "</h1>";
    h += '<div class="card hero" style="margin-top:12px"><div class="ring"><svg width="112" height="112"><circle cx="56" cy="56" r="' + R2 + '" stroke="var(--line)" stroke-width="10" fill="none"/><circle cx="56" cy="56" r="' + R2 + '" stroke="var(--brand)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="' + CIR.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" style="transition:stroke-dashoffset .6s"/></svg><div class="c"><div><b>' + Math.round(g.pct * 100) + '</b><span class="dim small">%</span><div class="dim small">오늘 목표</div></div></div></div>';
    h += '<div class="goal"><div class="g"><span class="k" style="background:#4EA8FF"></span>레슨 1개<span class="v">' + Math.min(g.o.l || 0, 99) + "/1</span></div>";
    h += '<div class="g"><span class="k" style="background:#F5B83D"></span>퀴즈 ' + g.gq + "문제<span class=\"v\">" + (g.o.q || 0) + "/" + g.gq + "</span></div>";
    h += '<div class="g"><span class="k" style="background:#2FBF71"></span>SQL 1문제<span class="v">' + (g.o.s || 0) + "/1</span></div>";
    h += '<div class="dim small" style="margin-top:2px">🔥 연속 ' + st + "일째</div></div></div>";
    var nl = nextLesson();
    if (nl) h += '<button class="card item next" style="margin-top:10px" data-go="lesson-' + nl.id + '"><span class="ic" style="background:' + nl.cat.color + '22">' + nl.cat.icon + '</span><span class="grow"><span class="s">다음 역 · ' + nl.cat.no + "호선 " + esc(nl.cat.name) + ' · ' + nl.min + '분</span><br><span class="t">' + esc(nl.title) + '</span></span><span class="chev">›</span></button>';
    var dp = dailyProblem();
    h += '<button class="card item next" data-go="sql-' + dp.id + '"><span class="ic">🧮</span><span class="grow"><span class="s">오늘의 SQL · <span class="pill l' + dp.lv + '">' + LVN[dp.lv] + '</span></span><br><span class="t">' + esc(dp.title) + '</span></span><span class="chev">›</span></button>';
    h += '<button class="card item next" data-go="tutor"><span class="ic">🤖</span><span class="grow"><span class="s">AI 튜터 · ' + (AIMODE === "claude" ? "Claude 계정" : AIMODE === "api" ? "내 API 키" : AIMODE === "handoff" ? "Claude로 넘겨서 무료 질문" : "설정 필요") + '</span><br><span class="t">궁금한 걸 바로 물어보기</span></span><span class="chev">›</span></button>';
    var wl = wrongList().length;
    h += '<div class="grid2" style="margin-top:10px"><button class="card item" data-act="quick10" style="flex-direction:column;align-items:flex-start;gap:2px"><span style="font-size:20px">⚡</span><span class="t">랜덤 퀴즈</span><span class="s">' + (S.settings.goalQ || 10) + '문제 바로 풀기</span></button>';
    h += '<button class="card item" data-act="review" style="flex-direction:column;align-items:flex-start;gap:2px"' + (wl ? "" : " disabled") + '><span style="font-size:20px">📕</span><span class="t">오답 복습</span><span class="s">' + (wl ? wl + "문제 대기 중" : "오답이 없어요") + "</span></button></div>";
    h += "<h2>노선도</h2><div class=\"lines\">";
    C.forEach(function (c) { var p = catProgress(c); h += '<button class="ln" data-go="line-' + c.id + '"><span class="h">' + badge(c) + esc(c.name) + '</span><span class="bar"><i style="width:' + Math.round(p.d / p.n * 100) + "%;background:" + c.color + '"></i></span><span class="dim small">' + p.d + "/" + p.n + " 역</span></button>"; });
    h += "</div>";
    // 기록
    var days = [], d = new Date(); d.setDate(d.getDate() - 27);
    for (var i = 0; i < 28; i++) { var k = today(d), o = S.days[k], v = o ? (o.l || 0) * 3 + (o.q || 0) + (o.s || 0) * 3 : 0; days.push('<i class="' + (v >= 12 ? "l3" : v >= 5 ? "l2" : v > 0 ? "l1" : "") + '" title="' + k + '"></i>'); d.setDate(d.getDate() + 1); }
    var ld = Object.keys(S.lessons).length, acc = quizAcc(ALLQ), sv = solvedCount();
    h += '<h2>나의 기록</h2><div class="card"><div class="grid2" style="grid-template-columns:repeat(3,1fr);text-align:center;margin-bottom:14px">';
    h += '<div><div style="font:700 20px var(--mono)">' + ld + '<span class="dim small">/' + LESSONS.length + '</span></div><div class="dim small">완료 레슨</div></div>';
    h += '<div><div style="font:700 20px var(--mono)">' + (acc == null ? "-" : acc + "%") + '</div><div class="dim small">퀴즈 정답률</div></div>';
    h += '<div><div style="font:700 20px var(--mono)">' + sv + '<span class="dim small">/' + P.length + '</span></div><div class="dim small">SQL 해결</div></div></div>';
    h += '<div class="dim small" style="margin-bottom:6px">최근 4주</div><div class="heat">' + days.join("") + "</div></div>";
    h += '<p class="dim small" style="text-align:center;margin-top:18px">' + (cloud.on ? "☁️ 학습 기록이 계정에 동기화되고 있어요" : "💾 학습 기록은 이 기기에 저장돼요 (설정 ⚙️ → 백업으로 옮길 수 있어요)") + '<br><button class="dim small" data-act="changelog" style="margin-top:4px;font-family:var(--mono)">디비빅SQL v' + VERSION + " · 업데이트 내역</button></p>";
    return h;
  };

  V.learn = function () {
    var h = "<h1>학습 노선도</h1><p class=\"muted\" style=\"margin:0 0 14px\">노선(분야)을 고르고 역(레슨)을 하나씩 지나가세요. 한 역은 3~7분이에요.</p>";
    h += '<button class="card item" data-go="glossary" style="margin-bottom:12px"><span class="ic" style="font-size:20px">📖</span><span class="grow"><span class="t">약어 사전</span><br><span class="s">LGWR, SGA, RMAN… ' + GL.filter(function (e) { return !e.h; }).length + '개 약어의 풀이와 뜻</span></span><span class="chev">›</span></button><div class="list">';
    C.forEach(function (c) {
      var p = catProgress(c), acc = quizAcc(c.quiz);
      h += '<button class="item" data-go="line-' + c.id + '">' + badge(c, 30) + '<span class="grow"><span class="t">' + esc(c.name) + ' <span class="dim small">' + c.icon + '</span></span><br><span class="s">' + esc(c.desc) + '</span><span class="bar" style="margin-top:7px"><i style="width:' + Math.round(p.d / p.n * 100) + "%;background:" + c.color + '"></i></span></span><span style="text-align:right"><span class="small" style="font-family:var(--mono)">' + p.d + "/" + p.n + '</span><br><span class="dim small">' + (acc == null ? "" : "정답 " + acc + "%") + '</span></span></button>';
    });
    return h + "</div>";
  };

  var glQuery = "";
  function glossaryList(q) {
    q = (q || "").trim().toLowerCase();
    var groups = window.DBBIG_GLOSSARY_GROUPS || [], h = "", n = 0;
    groups.forEach(function (g) {
      var items = GL.filter(function (e) { return !e.h && e.g === g[0] && (!q || (e.k + " " + e.f + " " + e.d).toLowerCase().indexOf(q) >= 0); });
      if (!items.length) return;
      n += items.length;
      h += "<h2>" + esc(g[1]) + ' <span class="dim small">' + items.length + "</span></h2><div class=\"card gl\">";
      items.forEach(function (e) { h += '<div class="gli"><div class="glk">' + esc(e.k) + '</div><div class="grow"><div class="glf">' + esc(e.f) + "</div><div class=\"small muted\">" + esc(e.d) + "</div></div></div>"; });
      h += "</div>";
    });
    return n ? h : '<div class="empty"><div class="e">🔍</div>찾는 약어가 없어요.</div>';
  }
  V.glossary = function () {
    var h = '<h1>약어 사전</h1><p class="muted" style="margin:0 0 12px">레슨·퀴즈·SQL 문제에 나오는 약어를 Oracle 공식 명칭으로 풀었어요. 본문에서는 처음 나올 때 <b>LGWR</b><span class="abx">(Log Writer)</span>처럼 보여줘요' + (abOn() ? "." : " (지금은 설정에서 꺼져 있어요).") + "</p>";
    h += '<input id="glq" type="search" placeholder="약어·이름·설명 검색 (예: LGWR, 리두)" value="' + esc(glQuery) + '" style="width:100%;height:42px;border-radius:10px;border:1px solid var(--line2);background:var(--card2);padding:0 12px;font-size:15px;color:var(--tx)">';
    h += '<div id="gll">' + glossaryList(glQuery) + "</div>";
    return h;
  };

  V.line = function (id) {
    var c = catById(id); if (!c) return V.learn();
    var p = catProgress(c);
    var h = '<div class="row" style="margin:6px 0 4px">' + badge(c, 34) + '<div><h1 style="margin:0">' + esc(c.name) + '선</h1><div class="muted small">' + esc(c.desc) + " · " + p.d + "/" + p.n + " 역 완료</div></div></div>";
    h += '<div class="metro" style="--lc:' + c.color + ';margin-top:16px">';
    c.lessons.forEach(function (l) {
      h += '<button class="stn' + (S.lessons[l.id] ? " done" : "") + '" data-go="lesson-' + l.id + '"><span class="rail"><span class="node"></span></span><span class="body"><span class="t">' + esc(l.title) + '</span><br><span class="s">' + l.min + "분" + (S.lessons[l.id] ? " · ✓ 완료" : "") + "</span></span></button>";
    });
    h += "</div>";
    h += '<button class="btn pri block" data-act="catquiz" data-cat="' + c.id + '" style="margin-top:8px">' + c.name + " 퀴즈 " + c.quiz.length + "문제 풀기</button>";
    return h;
  };

  function hl(code, lang) {
    var KW = /^(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|OUTER|INNER|GROUP|BY|ORDER|HAVING|DESC|ASC|FETCH|FIRST|ROWS|ONLY|WITH|CASE|WHEN|THEN|ELSE|END|DISTINCT|UNION|ALL|CREATE|ALTER|DROP|TABLE|INDEX|USER|TABLESPACE|DATABASE|SYSTEM|SESSION|GRANT|REVOKE|TO|SET|UPDATE|INSERT|INTO|VALUES|DELETE|BEGIN|EXEC|STARTUP|SHUTDOWN|MOUNT|NOMOUNT|OPEN|IMMEDIATE|BACKUP|RESTORE|RECOVER|RUN|CONFIGURE|DELETE|CROSSCHECK|LIKE|BETWEEN|OVER|PARTITION|LIMIT|SHOW|PLUGGABLE|DATAFILE|DISKGROUP|ADD|DISK|REBALANCE|POWER|SEQUENCE|CACHE|NOORDER|AUDIT|POLICY|ACTIONS|PROFILE|IDENTIFIED|DEFAULT|TEMPORARY|QUOTA|UNLIMITED|ACCOUNT|UNLOCK|KILL|INCREMENTAL|LEVEL|PLUS|ARCHIVELOG|DIRECTORY|READ|WRITE|RESETLOGS|UNTIL|TIME|ENABLE|ROW|MOVEMENT|SHRINK|SPACE|CASCADE|MOVE|ONLINE|OFFLINE|SAVE|STATE|INSTANCES|CONTAINER|REPLACE|OR|FOR|NOPROMPT|OBSOLETE|EXPIRED|LIST|CORRUPTION|BLOCK|STANDBY|MANAGED|DISCONNECT|CANCEL|SERVICE|REPLACE|FORCE)$/i;
    var out = "";
    code.split("\n").forEach(function (line, li) {
      var re = lang === "bash" ? /(#.*$)|('[^']*'|"[^"]*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w$#]*)|([\s\S])/g : /(--.*$)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w$#]*)|([\s\S])/g, m;
      if (lang === "text") { out += esc(line) + "\n"; return; }
      while ((m = re.exec(line))) {
        if (m[1]) { if (lang === "bash" && m.index > 0 && /\S/.test(line[m.index - 1])) { out += esc(m[1][0]); re.lastIndex = m.index + 1; continue; } out += '<span class="cm">' + esc(m[1]) + "</span>"; }
        else if (m[2]) out += '<span class="st">' + esc(m[2]) + "</span>";
        else if (m[3]) out += '<span class="nu">' + esc(m[3]) + "</span>";
        else if (m[4]) out += (lang !== "bash" && KW.test(m[4])) ? '<span class="kw">' + esc(m[4]) + "</span>" : esc(m[4]);
        else out += esc(m[5]);
      }
      out += "\n";
    });
    return out.replace(/\n$/, "");
  }
  var CODES = [];
  function codeBlock(lang, code) { CODES.push(code); return '<pre class="code"><span class="lang">' + esc(lang.toUpperCase()) + '</span><button class="cp" data-act="copy" data-i="' + (CODES.length - 1) + '">복사</button>\n' + hl(code, lang) + "</pre>"; }
  function blocks(body, u) {
    return body.map(function (b) {
      switch (b[0]) {
        case "p": return "<p>" + mdx(b[1], u) + "</p>";
        case "ul": return "<ul>" + b[1].map(function (x) { return "<li>" + mdx(x, u) + "</li>"; }).join("") + "</ul>";
        case "code": return codeBlock(b[1], b[2]);
        case "tip": return '<div class="callout tip"><span>💡</span><div>' + mdx(b[1], u) + "</div></div>";
        case "warn": return '<div class="callout warn"><span>⚠️</span><div>' + mdx(b[1], u) + "</div></div>";
        case "tbl": return '<div class="tbl"><table><tr>' + b[1][0].map(function (x) { return "<th>" + mdx(x, u) + "</th>"; }).join("") + "</tr>" + b[1].slice(1).map(function (r) { return "<tr>" + r.map(function (x) { return "<td>" + mdx(x, u) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table></div>";
      }
      return "";
    }).join("");
  }

  V.lesson = function (id) {
    var l = lessonById(id); if (!l) return V.learn();
    CODES = [];
    var c = l.cat, idx = c.lessons.indexOf(l), done = !!S.lessons[l.id];
    var h = '<div class="row small muted" style="margin-top:8px">' + badge(c, 20) + c.name + "선 · " + (idx + 1) + "번째 역 · " + l.min + "분</div>";
    h += '<h1 style="margin-top:6px">' + esc(l.title) + "</h1>";
    if (canSpeak()) h += '<button class="btn sm" id="spk" data-act="speak" style="margin:6px 0 2px">' + (speaking ? "⏹ 정지" : "🎧 듣기") + "</button>";
    h += '<div class="lesson">' + blocks(l.body, abUnit(c)) + "</div>";
    if (l.ref && l.ref.length) h += '<div class="card" style="margin-top:14px;padding:12px 14px"><div class="small" style="font-weight:600;margin-bottom:6px">📚 근거 문서 (Oracle 공식)</div>' + l.ref.map(function (r) { return '<a class="small" style="display:block;margin:4px 0;word-break:break-word" href="' + esc(r[1]) + '" target="_blank" rel="noopener">' + esc(r[0]) + " ↗</a>"; }).join("") + "</div>";
    if (AI) h += '<details class="fold"><summary>🤖 이 레슨에 대해 AI에게 질문</summary><div class="in"><div class="row"><input id="lq" placeholder="예: 실무에서 이 명령 쓸 때 주의점?" style="flex:1;height:40px;border-radius:10px;border:1px solid var(--line2);background:var(--card2);padding:0 10px"><button class="btn sm pri" data-act="lessonai">질문</button></div><div class="ai" id="lai" style="display:none"></div></div></details>';
    h += '<div class="lessonbar">';
    var nx = c.lessons[idx + 1];
    h += '<button class="btn ' + (done ? "" : "pri") + ' block" data-act="done" data-id="' + l.id + '">' + (done ? (nx ? "다음 역으로 ›" : "노선도로 ›") : "✓ 완료" + (nx ? " · 다음 역" : "")) + "</button></div>";
    h += '<button class="btn ghost block" data-act="catquiz" data-cat="' + c.id + '" style="margin-top:6px">이 노선 퀴즈 풀기</button>';
    return h;
  };

  /* ── 퀴즈 ── */
  var QS = null; // 퀴즈 세션
  function startQuiz(items, title, opts) {
    if (!items.length) { toast("풀 문제가 없어요"); return; }
    QS = { title: title, items: items.map(function (q) { var order = shuffle(q.o.map(function (_, i) { return i; })); return { q: q, order: order }; }), i: 0, res: [], ai: !!(opts && opts.ai), review: !!(opts && opts.review) };
    go("quizrun");
  }
  V.quiz = function () {
    var wl = wrongList().length, acc = quizAcc(ALLQ);
    var h = "<h1>퀴즈</h1><p class=\"muted\" style=\"margin:0 0 14px\">총 " + ALLQ.length + "문제 · 전체 정답률 " + (acc == null ? "-" : acc + "%") + "</p>";
    h += '<div class="grid2"><button class="btn pri" data-act="quick10">⚡ 랜덤 ' + (S.settings.goalQ || 10) + '문제</button><button class="btn" data-act="review"' + (wl ? "" : " disabled") + ">📕 오답 복습 " + (wl ? "(" + wl + ")" : "") + "</button></div>";
    h += '<button class="btn block" data-act="weak" style="margin-top:8px">🎯 약점 집중 (정답률 낮은 문제)</button>';
    if (AI && AIMODE !== "handoff") h += '<details class="fold" style="margin-top:8px"><summary>🤖 AI가 새 문제 만들기</summary><div class="in"><p class="small muted" style="margin-top:0">고른 분야로 실무형 4지선다 5문제를 새로 만들어요. AI 생성 문제는 저장되지 않으며 틀릴 수 있어요.</p><div class="row" style="flex-wrap:wrap;gap:6px">' + C.map(function (c) { return '<button class="btn sm" data-act="aiquiz" data-cat="' + c.id + '">' + c.icon + " " + esc(c.name) + "</button>"; }).join("") + "</div></div></details>";
    h += "<h2>분야별</h2><div class=\"list\">";
    C.forEach(function (c) {
      var a = quizAcc(c.quiz), tried = c.quiz.filter(function (q) { return S.quiz[q.id]; }).length;
      h += '<button class="item" data-act="catquiz" data-cat="' + c.id + '">' + badge(c, 28) + '<span class="grow"><span class="t">' + esc(c.name) + '</span><br><span class="s">' + c.quiz.length + "문제 · 푼 문제 " + tried + "</span></span><span class=\"small\" style=\"font-family:var(--mono);color:" + (a == null ? "var(--tx3)" : a >= 80 ? "var(--ok)" : a >= 50 ? "var(--warn)" : "var(--bad)") + '">' + (a == null ? "—" : a + "%") + '</span><span class="chev">›</span></button>';
    });
    return h + "</div>";
  };
  V.quizrun = function () {
    if (!QS) return V.quiz();
    if (QS.i >= QS.items.length) return quizResult();
    var it = QS.items[QS.i], q = it.q, r = QS.res[QS.i], u = abUnit(q.cat);
    var h = '<div class="prog">' + QS.items.map(function (_, i) { var x = QS.res[i]; return '<i class="' + (x ? (x.ok ? "ok" : "bad") : i === QS.i ? "cur" : "") + '"></i>'; }).join("") + "</div>";
    h += '<div class="card qcard"><div class="qmeta">' + (q.cat ? badge(q.cat, 20) + esc(q.cat.name) : "🤖 AI 생성") + '<span style="margin-left:auto;font-family:var(--mono)">' + (QS.i + 1) + "/" + QS.items.length + '</span></div><div class="qtext">' + mdx(q.q, u) + '</div><div class="opts">';
    it.order.forEach(function (oi, k) {
      var cls = "opt";
      if (r) { if (oi === q.a) cls += " right"; else if (oi === r.pick) cls += " wrong"; }
      h += '<button class="' + cls + '" data-act="pick" data-o="' + oi + '"' + (r ? " disabled" : "") + '><span class="n">' + "ABCD"[k] + "</span><span>" + mdx(q.o[oi], u) + "</span></button>";
    });
    h += "</div>";
    if (r) {
      h += '<div class="expl"><b class="' + (r.ok ? "ok" : "bad") + '">' + (r.ok ? "정답!" : "오답") + "</b> " + mdx(q.e, u) + "</div>";
      if (AI) h += '<button class="btn sm" data-act="quizai" style="margin-top:10px">🤖 더 자세히 설명</button><div class="ai" id="qai" style="display:none"></div>';
    }
    h += "</div>";
    if (r) h += '<button class="btn pri block" data-act="qnext" style="margin-top:12px">' + (QS.i + 1 < QS.items.length ? "다음 문제 ›" : "결과 보기") + "</button>";
    return h;
  };
  function quizResult() {
    var ok = QS.res.filter(function (x) { return x && x.ok; }).length, n = QS.items.length;
    var h = '<div class="card" style="text-align:center;padding:26px 16px;margin-top:10px"><div class="dim small">' + esc(QS.title) + '</div><div class="score" style="margin:10px 0;color:' + (ok / n >= .8 ? "var(--ok)" : ok / n >= .5 ? "var(--warn)" : "var(--bad)") + '">' + ok + '<span style="font-size:28px;color:var(--tx3)">/' + n + "</span></div><div class=\"muted\">" + (ok === n ? "완벽해요! 🎉" : ok / n >= .8 ? "훌륭해요. 틀린 것만 다시 보면 끝!" : ok / n >= .5 ? "절반 이상! 오답노트로 굳혀요." : "레슨을 한 번 더 보고 다시 도전해요.") + "</div></div>";
    var wrong = QS.items.filter(function (_, i) { return QS.res[i] && !QS.res[i].ok; });
    if (wrong.length) {
      h += "<h2>틀린 문제</h2><div class=\"list\">";
      wrong.forEach(function (it) { var u = abUnit(it.q.cat); h += '<div class="card"><div class="small dim">' + (it.q.cat ? esc(it.q.cat.name) : "AI") + '</div><div style="font-weight:600;margin:4px 0">' + mdx(it.q.q, u) + '</div><div class="small"><b style="color:var(--ok)">정답</b> ' + mdx(it.q.o[it.q.a], u) + '</div><div class="small muted" style="margin-top:4px">' + mdx(it.q.e, u) + "</div></div>"; });
      h += "</div>";
    }
    h += '<div class="grid2" style="margin-top:14px">' + (wrong.length ? '<button class="btn pri" data-act="retrywrong">틀린 것만 다시</button>' : '<button class="btn pri" data-act="quick10">새 랜덤 퀴즈</button>') + '<button class="btn" data-go="quiz">퀴즈 홈</button></div>';
    return h;
  }

  /* ── SQL ── */
  var sqlFilter = 0;
  V.sql = function () {
    var sv = solvedCount();
    var h = "<h1>SQL 문제풀이</h1><p class=\"muted\" style=\"margin:0 0 12px\">폰 안에서 실제로 실행되는 실습 DB에 쿼리를 날려 채점해요. 해결 " + sv + "/" + P.length + "</p>";
    h += '<button class="item" data-go="sandbox" style="margin-bottom:12px;border-color:rgba(255,107,61,.35)"><span style="font-size:24px">🧪</span><span class="grow"><span class="t">자유 실습 (샌드박스)</span><br><span class="s">EMP/DEPT + GV$SESSION·DBA_* 가상 딕셔너리로 마음껏</span></span><span class="chev">›</span></button>';
    h += '<div class="seg" style="margin-bottom:12px">' + [[0, "전체"], [1, "기초"], [2, "중급"], [3, "DBA 실무"]].map(function (f) { var n = f[0] ? P.filter(function (p) { return p.lv === f[0]; }) : P, d = n.filter(function (p) { return S.sql[p.id] && S.sql[p.id].solved; }).length; return '<button class="' + (sqlFilter === f[0] ? "on" : "") + '" data-act="sqlf" data-f="' + f[0] + '">' + f[1] + ' <span class="dim">' + d + "/" + n.length + "</span></button>"; }).join("") + "</div><div class=\"list\">";
    P.filter(function (p) { return !sqlFilter || p.lv === sqlFilter; }).forEach(function (p, i) {
      var st = S.sql[p.id] || {};
      h += '<button class="item" data-go="sql-' + p.id + '"><span class="check' + (st.solved ? " on" : "") + '">' + (st.solved ? "✓" : "") + '</span><span class="grow"><span class="t">' + esc(p.title) + '</span><br><span class="s"><span class="pill l' + p.lv + '">' + LVN[p.lv] + "</span> " + p.tables.join(", ") + (st.tries && !st.solved ? ' · <span style="color:var(--warn)">시도 ' + st.tries + "회</span>" : "") + '</span></span><span class="chev">›</span></button>';
    });
    return h + "</div>";
  };

  var KB_BASE = [["op", "*"], ["op", ","], ["op", "("], ["op", ")"], ["op", "'"], ["op", "="], ["op", "<>"], ["op", ">="], ["op", "<="], ["op", "||"], ["op", "."], ["sep"],
    ["k", "SELECT"], ["k", "FROM"], ["k", "WHERE"], ["k", "AND"], ["k", "OR"], ["k", "GROUP BY"], ["k", "HAVING"], ["k", "ORDER BY"], ["k", "DESC"], ["k", "AS"], ["k", "JOIN"], ["k", "LEFT JOIN"], ["k", "ON"], ["k", "IN"], ["k", "LIKE"], ["k", "IS NULL"], ["k", "IS NOT NULL"], ["k", "BETWEEN"], ["k", "DISTINCT"], ["k", "CASE WHEN"], ["k", "THEN"], ["k", "ELSE"], ["k", "END"], ["k", "FETCH FIRST"], ["k", "ROWS ONLY"], ["sep"],
    ["k", "COUNT("], ["k", "SUM("], ["k", "AVG("], ["k", "MAX("], ["k", "MIN("], ["k", "ROUND("], ["k", "NVL("], ["k", "TO_CHAR("], ["k", "DECODE("], ["k", "SYSDATE"], ["k", "OVER ("], ["k", "PARTITION BY"], ["k", "RANK()"], ["k", "LISTAGG("]];
  function kbarHtml(tables) {
    var h = '<div class="kbar" id="kbar">';
    h += '<button data-ins="⏎" class="op">⏎</button><button data-ins="⇥" class="op">␣␣</button>';
    KB_BASE.forEach(function (k) { if (k[0] === "sep") h += '<span class="sepv"></span>'; else h += '<button class="' + (k[0] === "op" ? "op" : "") + '" data-ins="' + esc(k[1]) + '">' + esc(k[1]) + "</button>"; });
    if (tables && tables.length) {
      h += '<span class="sepv"></span>';
      tables.forEach(function (t) { h += '<button class="tb" data-ins="' + esc(t.name) + '">' + esc(t.name) + "</button>"; });
      tables.forEach(function (t) { (t.cols || []).forEach(function (c) { h += '<button class="tb" style="color:#B9C2CF" data-ins="' + esc(c[0]) + '">' + esc(c[0]) + "</button>"; }); });
    }
    return h + "</div>";
  }
  function insertAt(ta, text) {
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    if (text === "⏎") text = "\n"; else if (text === "⇥") text = "  ";
    else {
      var before = v.slice(0, s), needSpace = before && !/[\s(.,]$/.test(before) && !/^[),.]/.test(text);
      var isOpenFn = /\($/.test(text), isPunct = /^[(),.*'=<>|]+$/.test(text);
      if (isPunct && text !== "*" && text !== "=" && text !== "<>" && text !== ">=" && text !== "<=" && text !== "||") needSpace = text === "(" ? needSpace && !/\w$/.test(before) : false;
      if (text === "'") needSpace = before && !/[\s(,=]$/.test(before) && !/'$/.test(before) ? needSpace : false;
      text = (needSpace ? " " : "") + text + (isPunct || isOpenFn || text === "." ? "" : " ");
    }
    ta.value = v.slice(0, s) + text + v.slice(e);
    var p = s + text.length; ta.setSelectionRange(p, p);
    ta.dispatchEvent(new Event("input"));
  }
  function fmtCell(v) {
    if (v === null || v === undefined) return '<td class="null">(null)</td>';
    if (typeof v === "number") { if (EN.isDate(v)) return "<td>" + esc(EN.fmtDate(v, "YYYY-MM-DD HH24:MI:SS").replace(/ 00:00:00$/, "")) + "</td>"; return '<td class="n">' + esc(Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6)) + "</td>"; }
    if (v instanceof Uint8Array) return "<td>(BLOB)</td>";
    return "<td>" + esc(v) + "</td>";
  }
  function resultHtml(r, label) {
    if (!r.isSelect) return '<div class="rmeta">✅ 실행 완료 · ' + (r.changes || 0) + "행 변경</div>";
    var max = 300, rows = r.values.slice(0, max);
    var h = '<div class="rmeta">' + (label ? "<b>" + esc(label) + "</b> · " : "") + r.values.length + "행" + (r.values.length > max ? " (앞 " + max + "행 표시)" : "") + (r.ms != null ? " · " + r.ms + "ms" : "") + "</div>";
    h += '<div class="rgrid"><table><tr>' + r.columns.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr>";
    if (!rows.length) h += '<tr><td colspan="' + Math.max(1, r.columns.length) + '" class="null">결과 없음 (0행)</td></tr>';
    rows.forEach(function (row) { h += "<tr>" + row.map(fmtCell).join("") + "</tr>"; });
    return h + "</table></div>";
  }

  V.prob = function (id) {
    var p = PBYID[id]; if (!p) return V.sql();
    var st = S.sql[p.id] || {}, idx = P.indexOf(p), u = abUnit(null);
    var h = '<div class="row" style="margin-top:8px"><span class="pill l' + p.lv + '">' + LVN[p.lv] + '</span><span class="dim small">' + (idx + 1) + "/" + P.length + "</span>" + (st.solved ? '<span class="pill" style="color:var(--ok);border-color:rgba(47,191,113,.4)">✓ 해결</span>' : "") + "</div>";
    h += '<h1 style="margin-top:6px">' + esc(p.title) + '</h1><div class="pq">' + mdx(p.q, u) + "</div>";
    h += '<div class="tchips">' + p.tables.map(function (t) { return '<button class="tchip" data-act="schema" data-t="' + t + '">' + t + " ⓘ</button>"; }).join("") + "</div>";
    h += '<div class="editor"><textarea id="ed" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="SELECT ...">' + esc(DR["p:" + p.id] || "") + '</textarea><div id="kb"></div></div>';
    h += '<div class="runbar"><button class="btn" data-act="run">▶ 실행</button><button class="btn pri" data-act="grade">✓ 채점</button></div>';
    h += '<div class="result" id="res"></div>';
    h += '<details class="fold"><summary>💡 힌트</summary><div class="in">' + mdx(p.hint, u) + "</div></details>";
    h += '<details class="fold" id="ansf"><summary>🔑 모범 답안</summary><div class="in">' + codeBlock("sql", formatSql(p.answer)) + (p.note ? '<div class="callout tip"><span>📌</span><div>' + mdx(p.note, u) + "</div></div>" : "") + '<button class="btn sm" data-act="useans">에디터에 넣기</button></div></details>';
    h += '<div class="grid2" style="margin-top:14px">' + (idx > 0 ? '<button class="btn" data-go="sql-' + P[idx - 1].id + '">‹ 이전</button>' : "<span></span>") + (idx < P.length - 1 ? '<button class="btn" data-go="sql-' + P[idx + 1].id + '">다음 ›</button>' : "<span></span>") + "</div>";
    return h;
  };
  function formatSql(s) {
    return s.replace(/\s+(FROM|WHERE|GROUP BY|HAVING|ORDER BY|LEFT JOIN|JOIN|FETCH FIRST|UNION ALL|UNION)\s+/g, "\n$1 ").replace(/\s+(AND)\s+/g, "\n   AND ").replace(/\(SELECT/g, "(\n  SELECT");
  }
  A.prob = function (id) {
    var p = PBYID[id]; if (!p) return;
    var ta = $("#ed"), kb = $("#kb");
    kb.innerHTML = kbarHtml(p.tables.map(function (t) { return { name: t, cols: [] }; }));
    ta.addEventListener("input", function () { saveDraft("p:" + p.id, ta.value); });
    getEngine().then(function (e) {
      var all = e.tables(), want = p.tables.map(function (t) { return all.filter(function (x) { return x.name === t; })[0]; }).filter(Boolean);
      if ($("#kb")) $("#kb").innerHTML = kbarHtml(want);
    }).catch(function () {});
  };
  function isReadOnly(sql) { var s = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim(); return /^(\(?\s*SELECT|WITH|DESC(RIBE)?\s)/i.test(s) || !s; }
  function runSql(mode, p) {
    var ta = $("#ed"), box = $("#res"), sql = ta.value;
    if (!sql.trim()) { toast("SQL을 입력해 주세요"); return; }
    if (p && !isReadOnly(sql)) { box.innerHTML = '<div class="err">문제 풀이에서는 SELECT(또는 WITH) 문만 실행할 수 있어요. DML/DDL 연습은 자유 실습을 이용하세요.</div>'; return; }
    box.innerHTML = '<div class="rmeta"><span class="spin"></span> 실습 DB 준비 중…</div>';
    getEngine().then(function (e) {
      var out = "", ok = false, userRes = null, errMsg = null;
      try {
        if (mode === "grade") {
          var g = e.grade(sql, p.answer, p.ordered); userRes = g.user;
          ok = g.verdict.ok;
          out += resultHtml(g.user, "내 결과");
          if (ok) out += '<div class="verdict ok"><div class="h">🎉 정답입니다!</div>' + (p.note ? mdx(p.note, abUnit(null)) : "결과가 모범 답안과 일치해요.") + "</div>";
          else out += '<div class="verdict bad"><div class="h">아직이에요</div>' + md(g.verdict.why) + (p.ordered ? "" : '<div class="dim small" style="margin-top:4px">이 문제는 행 순서는 채점하지 않아요.</div>') + '</div><details class="fold"><summary>정답 결과 미리보기</summary><div class="in">' + resultHtml(g.ans, "정답 결과") + "</div></details>";
          var st = S.sql[p.id] || (S.sql[p.id] = { tries: 0 });
          st.tries = (st.tries || 0) + 1;
          if (ok && !st.solved) { st.solved = Date.now(); bump("s"); toast("해결! 🎉 " + solvedCount() + "/" + P.length); }
          save(); renderTop();
        } else {
          userRes = e.run(sql); out = resultHtml(userRes);
        }
      } catch (err) { errMsg = String(err.message || err); out = '<div class="err">' + esc(errMsg) + "</div>"; if (mode === "grade" && p) { var s2 = S.sql[p.id] || (S.sql[p.id] = { tries: 0 }); s2.tries++; save(); } }
      if (AI && p && !ok && (errMsg || mode === "grade")) out += '<button class="btn sm" data-act="sqlai" style="margin-top:10px">🤖 AI 코치에게 물어보기</button><div class="ai" id="sai" style="display:none"></div>';
      box.innerHTML = out;
      box.dataset.err = errMsg || ""; box.dataset.why = "";
      if (mode === "grade" && userRes && !ok) { var w = box.querySelector(".verdict.bad"); box.dataset.why = w ? w.textContent : ""; }
      if (box.getBoundingClientRect().top > window.innerHeight - 120) box.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function () { box.innerHTML = '<div class="err">실습 엔진을 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.</div>'; });
  }

  var SANDBOX_EX = [
    ["블로킹 세션", "SELECT inst_id, sid, serial#, username, event, blocking_instance, blocking_session\nFROM gv$session\nWHERE blocking_session IS NOT NULL"],
    ["TS 사용률", "SELECT a.tablespace_name,\n       ROUND(a.bytes/1048576) alloc_mb,\n       ROUND((a.bytes - NVL(f.bytes,0))/1048576) used_mb\nFROM (SELECT tablespace_name, SUM(bytes) bytes FROM dba_data_files GROUP BY tablespace_name) a\nLEFT JOIN (SELECT tablespace_name, SUM(bytes) bytes FROM dba_free_space GROUP BY tablespace_name) f\n  ON a.tablespace_name = f.tablespace_name\nORDER BY 3 DESC"],
    ["백업 이력", "SELECT session_key, input_type, status,\n       TO_CHAR(start_time,'YYYY-MM-DD HH24:MI') started,\n       ROUND(elapsed_seconds/60) min\nFROM v$rman_backup_job_details\nORDER BY start_time DESC\nFETCH FIRST 10 ROWS ONLY"],
    ["ASM", "SELECT name, type, total_mb, free_mb, required_mirror_free_mb, usable_file_mb\nFROM v$asm_diskgroup"],
    ["NULL 정렬", "-- Oracle은 DESC 정렬 시 NULL이 맨 앞!\nSELECT ename, comm FROM emp ORDER BY comm DESC"],
    ["DML 연습", "UPDATE emp SET sal = sal * 1.1 WHERE deptno = 10"],
    ["DESC", "DESC gv$session"]
  ];
  V.sandbox = function () {
    var h = '<h1>자유 실습</h1><p class="muted small" style="margin:0 0 10px">SELECT·DML·DDL 모두 실행할 수 있어요. 실습 DB는 언제든 초기화할 수 있어요. 모든 데이터는 학습용 가상 데이터입니다.</p>';
    h += '<div class="row" style="flex-wrap:wrap;gap:6px">' + SANDBOX_EX.map(function (x, i) { return '<button class="btn sm" data-act="ex" data-i="' + i + '">' + esc(x[0]) + "</button>"; }).join("") + "</div>";
    h += '<div class="editor"><textarea id="ed" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="SELECT * FROM emp">' + esc(DR.sandbox || "SELECT * FROM v$instance") + '</textarea><div id="kb">' + kbarHtml([]) + "</div></div>";
    h += '<div class="runbar" style="grid-template-columns:2fr 1fr 1fr"><button class="btn pri" data-act="run">▶ 실행</button><button class="btn" data-act="schema" data-t="">📚 테이블</button><button class="btn" data-act="resetdb">↺ 초기화</button></div>';
    h += '<div class="result" id="res"></div>';
    h += '<details class="fold"><summary>ℹ️ 실습 엔진 호환 범위</summary><div class="in small muted">브라우저 내장 SQLite 위에 Oracle 호환 레이어를 얹은 엔진이에요.<br>✅ 지원: NVL/NVL2/DECODE/CASE, TO_CHAR/TO_DATE/TRUNC/ADD_MONTHS/MONTHS_BETWEEN/LAST_DAY/EXTRACT, SUBSTR/INSTR/LPAD/RPAD/INITCAP/REGEXP_*, LISTAGG, 윈도우 함수(RANK/ROW_NUMBER/LAG/LEAD/SUM OVER), FETCH FIRST/OFFSET, MINUS, WITH(재귀 포함), DATE 리터럴, SYSDATE 산술, Oracle식 NULL 정렬, DESC<br>❌ 미지원: ROWNUM, CONNECT BY, (+) 외부조인, PIVOT, PL/SQL, 시퀀스. 빈 문자열(\'\')과 NULL의 Oracle식 동일 처리도 일부 다를 수 있어요.</div></details>';
    return h;
  };
  A.sandbox = function () {
    var ta = $("#ed");
    ta.addEventListener("input", function () { saveDraft("sandbox", ta.value); });
    getEngine().then(function (e) { if ($("#kb")) $("#kb").innerHTML = kbarHtml(e.tables().map(function (t) { return { name: t.name, cols: [] }; })); }).catch(function () {});
  };

  /* ── 노트 ── */
  var noteTab = 0;
  V.notes = function () {
    var h = "<h1>노트</h1>";
    h += '<div class="seg" style="margin:10px 0 14px">' + ["📕 오답", "🧮 SQL", "📊 분야별", "📌 AI"].map(function (t, i) { return '<button class="' + (noteTab === i ? "on" : "") + '" data-act="ntab" data-i="' + i + '">' + t + "</button>"; }).join("") + "</div>";
    if (noteTab === 0) {
      var wl = wrongList();
      if (!wl.length) return h + '<div class="empty"><div class="e">✨</div>오답이 없어요. 퀴즈에서 틀린 문제가 여기에 모여요.<br>복습에서 맞히면 자동으로 빠져요.</div>';
      h += '<button class="btn pri block" data-act="review" style="margin-bottom:12px">오답 ' + wl.length + "문제 복습 시작</button><div class=\"list\">";
      wl.forEach(function (q) {
        var r = S.quiz[q.id] || { c: 0, w: 0 }, u = abUnit(q.cat);
        h += '<details class="fold" style="margin:0"><summary><span style="display:flex;flex-direction:column;gap:2px;font-weight:500"><span class="small dim">' + badge(q.cat, 16).replace('class="badge"', 'class="badge" style="display:inline-grid;vertical-align:-3px;width:16px;height:16px;font-size:9px;background:' + q.cat.color + '"') + " " + esc(q.cat.name) + " · ✓" + r.c + " ✗" + r.w + '</span><span>' + mdx(q.q, u) + '</span></span></summary><div class="in small"><div><b style="color:var(--ok)">정답</b> ' + mdx(q.o[q.a], u) + '</div><div class="muted" style="margin-top:6px">' + mdx(q.e, u) + '</div><button class="btn sm ghost" data-act="unwrong" data-id="' + q.id + '" style="margin-top:8px;padding:0">외웠어요 · 목록에서 빼기</button></div></details>';
      });
      return h + "</div>";
    }
    if (noteTab === 1) {
      var tried = P.filter(function (p) { return S.sql[p.id]; });
      if (!tried.length) return h + '<div class="empty"><div class="e">🧮</div>아직 채점한 SQL 문제가 없어요.<br><button class="btn pri" data-go="sql" style="margin-top:12px">SQL 문제 풀러 가기</button></div>';
      var uns = tried.filter(function (p) { return !S.sql[p.id].solved; }), sol = tried.filter(function (p) { return S.sql[p.id].solved; });
      if (uns.length) { h += "<h3>도전 중</h3><div class=\"list\">" + uns.map(function (p) { return '<button class="item" data-go="sql-' + p.id + '"><span class="check"></span><span class="grow"><span class="t">' + esc(p.title) + '</span><br><span class="s">시도 ' + S.sql[p.id].tries + '회</span></span><span class="chev">›</span></button>'; }).join("") + "</div>"; }
      if (sol.length) { h += "<h3>해결한 문제</h3><div class=\"list\">" + sol.map(function (p) { var s = S.sql[p.id]; return '<button class="item" data-go="sql-' + p.id + '"><span class="check on">✓</span><span class="grow"><span class="t">' + esc(p.title) + '</span><br><span class="s">' + (s.tries || 1) + "번 만에 해결 · " + today(new Date(s.solved)) + '</span></span><span class="chev">›</span></button>'; }).join("") + "</div>"; }
      return h;
    }
    if (noteTab === 3) {
      var sv = S.saved || [];
      if (!sv.length) return h + '<div class="empty"><div class="e">📌</div>저장한 AI 답변이 없어요.<br>AI 튜터 답변 아래 "📌 노트에 저장"을 누르면 여기에 모여요.<br><button class="btn pri" data-go="tutor" style="margin-top:12px">🤖 AI 튜터 열기</button></div>';
      CODES = [];
      h += '<div class="list">';
      sv.forEach(function (x) { h += '<details class="fold" style="margin:0"><summary><span style="display:flex;flex-direction:column;gap:2px;font-weight:500"><span class="small dim">' + today(new Date(x.ts)) + "</span><span>" + esc(x.q.length > 90 ? x.q.slice(0, 90) + "…" : x.q) + '</span></span></summary><div class="in tm a" style="border:0;padding:0 0 4px">' + mdLong(x.a) + '<button class="btn sm ghost" data-act="unsave" data-ts="' + x.ts + '" style="padding:0">🗑 삭제</button></div></details>'; });
      return h + "</div>";
    }
    h += '<div class="list">';
    C.forEach(function (c) {
      var a = quizAcc(c.quiz), p = catProgress(c);
      h += '<div class="card"><div class="row">' + badge(c, 24) + '<b>' + esc(c.name) + '</b><span class="dim small" style="margin-left:auto">레슨 ' + p.d + "/" + p.n + "</span></div>";
      h += '<div class="row small" style="margin-top:8px"><span class="dim" style="width:64px">정답률</span><span class="bar" style="flex:1"><i style="width:' + (a || 0) + "%;background:" + (a == null ? "var(--line)" : a >= 80 ? "var(--ok)" : a >= 50 ? "var(--warn)" : "var(--bad)") + '"></i></span><span style="font-family:var(--mono);width:40px;text-align:right">' + (a == null ? "—" : a + "%") + "</span></div></div>";
    });
    return h + "</div>";
  };

  var KEYHELP = '<h2>Claude API 키 발급</h2><ol class="small" style="padding-left:18px;line-height:1.7">' +
    "<li>PC 브라우저로 <b>platform.claude.com</b>(Claude Console)에 로그인해요. claude.ai 구독과는 별도인 개발자용 화면이에요.</li>" +
    "<li><b>Settings → Billing</b>에서 크레딧을 충전해요(선불). Max·Ultra 요금제는 Console 조직을 연결하면 매월 API 크레딧이 들어와요. Pro 요금제에는 API 사용이 포함되지 않아요.</li>" +
    "<li>안전장치로 <b>Workspace</b>를 하나 만들고 월 <b>Spend limit</b>(예: $5)을 걸어 두세요. 기본 Workspace에는 한도를 걸 수 없어요.</li>" +
    "<li>그 Workspace에서 <b>API Keys → Create Key</b>로 키를 만들고 복사해요. sk-ant- 로 시작해요.</li>" +
    "<li>앱 ⚙️ 설정 → AI → <b>키 넣기</b>에 붙여넣고 <b>테스트</b>를 눌러요.</li></ol>" +
    '<p class="small muted">비용 감: 질문 1,500토큰 + 답변 800토큰 기준 Sonnet 5.5 약 1센트, Haiku 5.5 약 0.06센트. 긴 메모를 붙여넣으면 그만큼 늘어요. 질문을 보낼 때만 과금돼요.</p>';
  /* ── AI 튜터 ── */
  var TKEY = "dbbigsql.tutor";
  var TU = (function () { try { var o = JSON.parse(localStorage.getItem(TKEY)); return o && o.msgs ? o : { msgs: [] }; } catch (e) { return { msgs: [] }; } })();
  TU.msgs.forEach(function (m) { if (m.live) { delete m.live; if (!m.t) m.err = "답변이 중간에 끊겼어요."; } });
  var tutor = { busy: false, clear: 0 };
  function tuSave() { TU.msgs = TU.msgs.slice(-40); try { localStorage.setItem(TKEY, JSON.stringify(TU)); } catch (e) {} }
  var TUTOR_SYS = "너는 '디비빅SQL' 앱의 Oracle DBA 튜터야. 학습자는 Oracle 19c를 공부하는 DB 엔지니어(초보~중급)이고 출퇴근 지하철에서 폰으로 읽어.\n" +
    "규칙:\n1) 한국어로 답해.\n2) Oracle 19c 기준으로 설명하고, 버전마다 다르면 그렇다고 밝혀.\n3) 약어는 처음 나올 때 LGWR(Log Writer)처럼 풀어 써.\n" +
    "4) 동작 흐름은 STEP 1, STEP 2 … 순서로 설명해.\n5) 표와 제목(#)은 쓰지 말고 짧은 문단과 글머리표(-)로 써. SQL·명령어는 ``` 코드 블록으로, 뷰·파라미터 이름은 `백틱`으로 감싸.\n" +
    "6) 확실하지 않은 내용은 지어내지 말고, 확인할 공식 문서 이름이나 MOS 검색 키워드를 알려줘.\n7) 실무에서 도움이 되는 팁이 있으면 마지막에 한두 줄로 덧붙여.";
  var HANDOFF_PRE = "[디비빅SQL 학습 질문] Oracle 19c 기준으로 한국어로 답해줘. 약어는 처음 나올 때 LGWR(Log Writer)처럼 풀어 쓰고, 동작 흐름은 STEP 1, STEP 2 순서로 설명해줘. 확실하지 않은 내용은 확인할 공식 문서나 MOS 검색어를 알려줘.\n\n";
  var TCHIPS = [
    ["UPDATE 내부 흐름", "UPDATE 한 건(UPDATE → COMMIT)이 처리될 때 서버 프로세스, Buffer Cache, Undo, Redo Log Buffer, LGWR, DBWn이 각각 무엇을 하는지 STEP 순서로 설명해줘."],
    ["COMMIT과 LGWR", "COMMIT을 하면 LGWR는 무엇을 언제 Redo Log File에 쓰나요? 'log file sync' 대기는 왜 생기나요?"],
    ["스위치 vs 체크포인트", "ALTER SYSTEM SWITCH LOGFILE과 ALTER SYSTEM CHECKPOINT의 차이를 Redo Log 그룹 상태(CURRENT/ACTIVE/INACTIVE) 변화와 함께 설명해줘."],
    ["SCN은 언제 증가?", "SCN은 언제 증가하나요? COMMIT 말고도 올라가는 경우와 확인하는 SQL을 알려줘."],
    ["📋 내 메모 검토받기", "아래는 내가 공부하며 정리한 내용이야. Oracle 19c 기준으로 틀렸거나 부정확한 부분만 골라서, 왜 틀렸는지와 올바른 내용을 알려줘. 맞는 부분은 다시 설명하지 않아도 돼.\n\n", 1]
  ];
  function mdLong(t) {
    var out = [], lines = String(t || "").replace(/\r/g, "").split("\n"), i = 0, list = null, m;
    function flush() { if (list) { out.push("<" + list.t + ">" + list.items.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</" + list.t + ">"); list = null; } }
    while (i < lines.length) {
      var ln = lines[i];
      if ((m = ln.match(/^\s*```\s*([\w-]*)/))) {
        flush(); var code = []; i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++; var lang = (m[1] || "").toLowerCase(); lang = lang === "sh" || lang === "shell" || lang === "console" ? "bash" : ["sql", "bash", "rman", "plsql"].indexOf(lang) >= 0 ? lang : "text";
        out.push(codeBlock(lang, code.join("\n"))); continue;
      }
      if ((m = ln.match(/^\s*[-*•]\s+(.*)$/))) { if (!list || list.t !== "ul") { flush(); list = { t: "ul", items: [] }; } list.items.push(m[1]); }
      else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)$/))) { if (!list || list.t !== "ol") { flush(); list = { t: "ol", items: [] }; } list.items.push(m[1]); }
      else if ((m = ln.match(/^\s*#{1,6}\s+(.*)$/))) { flush(); out.push("<p><b>" + md(m[1]) + "</b></p>"); }
      else if (!ln.trim()) flush();
      else { flush(); out.push("<p>" + md(ln) + "</p>"); }
      i++;
    }
    flush(); return out.join("");
  }
  function tmsgHtml(m, i) {
    if (m.r === "u") return '<div class="tm u">' + esc(m.t) + "</div>";
    var h = '<div class="tm a" id="tm' + i + '">' + (m.t ? mdLong(m.t) : m.err ? "" : '<span class="spin"></span> 생각하는 중…');
    if (m.err) h += '<div class="small" style="color:var(--bad)">⚠️ ' + esc(m.err) + "</div>";
    if (m.t && !m.live) h += '<div class="tacts"><button class="btn sm ghost" data-act="tsave" data-i="' + i + '">📌 노트에 저장</button><button class="btn sm ghost" data-act="tcopy" data-i="' + i + '">복사</button></div>';
    return h + "</div>";
  }
  V.tutor = function () {
    CODES = [];
    var h = "<h1>AI 튜터</h1>";
    if (!AI) {
      h += '<div class="card"><p style="margin-top:0">' + (window.claude ? "Claude AI 연결을 기다리는 중이에요. 잠시 후 다시 열어 주세요." : "설치형 앱에서는 <b>내 Claude API 키</b>로 AI를 써요. 키는 이 폰에만 저장되고, 질문할 때만 토큰이 쓰여요.") + "</p>";
      if (!window.claude) h += '<button class="btn pri block" data-act="setkey">🔑 API 키 넣기</button><button class="btn ghost block" data-act="keyhelp" style="margin-top:6px">API 키 발급 방법</button>';
      return h + "</div>";
    }
    if (AIMODE === "handoff") {
      h += '<div class="card" style="margin-top:6px"><p style="margin:0 0 6px"><b>내 Claude 계정(Pro)으로 무료 질문</b></p><p class="small muted" style="margin:0">질문을 쓰고 보내면 Claude가 열리면서 질문이 채워져요. 답은 Claude에서 확인하세요. 질문은 클립보드에도 복사돼서, 채워지지 않으면 붙여넣기만 하면 돼요.</p></div>';
      h += '<div class="qchips" style="margin-top:12px">' + TCHIPS.map(function (c, i) { return '<button class="qchip" data-act="tchip" data-i="' + i + '">' + esc(c[0]) + "</button>"; }).join("") + "</div>";
      h += '<div class="tin"><textarea id="tq" rows="4" placeholder="예: UPDATE 하면 내부에서 어떻게 동작해?">' + esc(DR.tutor || "") + '</textarea><button class="btn pri block" data-act="tsend" style="margin-top:8px">Claude에서 물어보기 ↗</button></div>';
      h += '<p class="dim small">앱 안에서 바로 답을 받으려면 claude.ai에서 디비빅SQL을 열거나, ⚙️ 설정에 API 키(유료, 선택)를 넣으면 돼요.</p>';
      return h;
    }
    h += '<p class="muted small" style="margin:0 0 6px">Oracle 19c 기준으로 답해요 · ' + (AIMODE === "api" ? esc(apiModel()[1]) + " · 이번 달 약 $" + apiUsage().usd.toFixed(2) : "Claude 계정으로 연결됨") + "</p>";
    h += '<div class="chat" id="chat">';
    if (!TU.msgs.length) h += '<div class="empty" style="padding:18px 8px"><div class="e">🤖</div>궁금한 걸 물어보세요.<br>공부한 메모를 붙여넣고 검토를 받을 수도 있어요.</div>';
    TU.msgs.forEach(function (m, i) { h += tmsgHtml(m, i); });
    h += "</div>";
    h += '<div class="qchips">' + TCHIPS.map(function (c, i) { return '<button class="qchip" data-act="tchip" data-i="' + i + '">' + esc(c[0]) + "</button>"; }).join("") + "</div>";
    h += '<div class="tin"><textarea id="tq" rows="3" placeholder="예: UPDATE 하면 내부에서 어떻게 동작해?">' + esc(DR.tutor || "") + '</textarea><div class="row" style="margin-top:6px"><button class="btn sm ghost" data-act="tclear">' + (tutor.clear ? "한 번 더 누르면 지워요" : "🗑 대화 지우기") + '</button><span style="flex:1"></span><button class="btn pri" data-act="tsend"' + (tutor.busy ? " disabled" : "") + ">보내기</button></div></div>";
    h += '<p class="dim small">AI 답변은 틀릴 수 있어요. 중요한 내용은 Oracle 공식 문서·MOS로 교차 확인하세요.</p>';
    return h;
  };
  A.tutor = function () {
    var ta = $("#tq"); if (ta) ta.addEventListener("input", function () { saveDraft("tutor", ta.value); });
    var ch = $("#chat"); if (ch && TU.msgs.length) { var us = ch.querySelectorAll(".tm.u"); var last = us[us.length - 1]; if (last) last.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); }
  };
  function tutorSend(text) {
    text = (text || "").trim(); if (!text || tutor.busy || !AI) return;
    if (AIMODE === "handoff") { handoff(/^\[디비빅SQL/.test(text) ? text : HANDOFF_PRE + text); saveDraft("tutor", ""); var ta0 = $("#tq"); if (ta0) ta0.value = ""; return; }
    TU.msgs.push({ r: "u", t: text, ts: Date.now() });
    var a = { r: "a", t: "", live: 1, ts: Date.now() + 1 }; TU.msgs.push(a); tuSave();
    var idx = TU.msgs.length - 1;
    saveDraft("tutor", ""); tutor.busy = true; tutor.clear = 0; render();
    var hist = TU.msgs.slice(0, -1).filter(function (m) { return m.t && !m.err; }).slice(-12);
    while (hist.length && hist[0].r !== "u") hist.shift();
    var merged = []; hist.forEach(function (m) { var l = merged[merged.length - 1]; if (l && l.r === m.r) l.t += "\n\n" + m.t; else merged.push({ r: m.r, t: m.t }); });
    var raf = 0;
    aiChat(merged, TUTOR_SYS, function (u) {
      a.t = u.text;
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; var b = $("#tm" + idx); if (b) b.innerHTML = mdLong(a.t); });
    }).then(function (r) { if (r && r.text) a.t = r.text; if (!a.t) a.err = "빈 답변이 왔어요. 다시 시도해 주세요."; })
      .catch(function (e) { a.err = aiFail(e); if (e && e.code === "not_granted") AI = null; })
      .then(function () {
        delete a.live; tutor.busy = false; tuSave();
        if (R.name === "tutor") { var b = $("#tm" + idx); if (b) b.outerHTML = tmsgHtml(a, idx); var btn = $('[data-act="tsend"]'); if (btn) btn.disabled = false; }
      });
  }

  /* ───────── 시트(모달) ───────── */
  function sheet(html) {
    var L = $("#layer");
    L.innerHTML = '<div class="sheet-bg" data-act="closesheet"><div class="sheet" role="dialog"><div class="grab"></div>' + html + "</div></div>";
  }
  function closeSheet() { $("#layer").innerHTML = ""; }
  function settingsSheet() {
    var s = S.settings;
    var h = '<h2 style="margin-top:4px">설정</h2><div class="settings">';
    h += '<div class="srow"><span>테마</span><div class="seg" style="width:200px">' + [["auto", "자동"], ["dark", "다크"], ["light", "라이트"]].map(function (t) { return '<button class="' + (s.theme === t[0] ? "on" : "") + '" data-act="theme" data-v="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div></div>";
    h += '<div class="srow"><span>글자 크기</span><div class="row"><button class="btn sm" data-act="fs" data-d="-1">A−</button><span style="font-family:var(--mono);width:44px;text-align:center">' + Math.round(s.fs * 100) + '%</span><button class="btn sm" data-act="fs" data-d="1">A+</button></div></div>';
    h += '<div class="srow"><span>하루 퀴즈 목표</span><div class="seg" style="width:170px">' + [5, 10, 20].map(function (n) { return '<button class="' + (s.goalQ === n ? "on" : "") + '" data-act="goal" data-v="' + n + '">' + n + "</button>"; }).join("") + "</div></div>";
    if (canSpeak()) h += '<div class="srow"><span>듣기 속도</span><div class="seg" style="width:200px">' + [0.9, 1, 1.2, 1.4].map(function (n) { return '<button class="' + ((s.rate || 1) === n ? "on" : "") + '" data-act="rate" data-v="' + n + '">' + n + "x</button>"; }).join("") + "</div></div>";
    h += '<div class="srow"><span>약어 풀이<br><span class="dim small">LGWR(Log Writer)처럼 표시</span></span><div class="seg" style="width:150px">' + [[1, "켜기"], [0, "끄기"]].map(function (t) { return '<button class="' + ((abOn() ? 1 : 0) === t[0] ? "on" : "") + '" data-act="abx" data-v="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div></div>";
    if (AIMODE === "claude") h += '<div class="srow"><span>AI 연결</span><span class="small muted">☁️ Claude 계정 (추가 비용 없음)</span></div>';
    else if (!window.claude) {
      var ak = apiKey(), au = apiUsage(), am = apiModel();
      h += '<div class="srow"><span>AI 질문 방식</span><span class="small muted" style="text-align:right">' + (ak ? "🔑 내 API 키 (앱 안에서 답변)" : "↗ Claude로 넘기기<br>내 Claude 계정 · 추가 비용 없음") + "</span></div>";
      h += '<div class="srow"><span>API 키 <span class="dim small">(선택·유료)</span><br><span class="dim small">' + (ak ? esc(ak.slice(0, 10)) + "…" + esc(ak.slice(-4)) : "없어도 됨") + '</span></span><div class="row">' + (ak ? '<button class="btn sm" data-act="aitest">테스트</button><button class="btn sm" data-act="setkey">변경</button>' : '<button class="btn sm" data-act="setkey">넣기</button>') + "</div></div>";
      if (ak) {
        h += '<div class="srow"><span>AI 모델</span><div class="seg" style="width:210px">' + MODELS.map(function (m) { return '<button class="' + (am[0] === m[0] ? "on" : "") + '" data-act="aimodel" data-v="' + m[0] + '">' + m[1] + "</button>"; }).join("") + "</div></div>";
        h += '<div class="srow"><span>이번 달 AI 사용<br><span class="dim small">요금표로 계산한 추정치</span></span><span class="small" style="text-align:right;font-family:var(--mono)">' + au.n + "회 · 약 $" + au.usd.toFixed(3) + '<br><span class="dim">입력 ' + au.i.toLocaleString() + " / 출력 " + au.o.toLocaleString() + "</span></span></div>";
      }
    }
    h += '<div class="srow"><span>동기화</span><span class="small muted">' + (cloud.on ? "☁️ 계정에 자동 저장 중" : "💾 이 기기에만 저장") + "</span></div>";
    h += '<div class="srow"><span>학습 기록 백업</span><div class="row"><button class="btn sm" data-act="export">복사</button><button class="btn sm" data-act="import">붙여넣기</button></div></div>';
    h += '<div class="srow"><span>버전</span><div class="row"><span class="small" style="font-family:var(--mono)">v' + VERSION + '</span><button class="btn sm" data-act="changelog">업데이트 내역</button></div></div>';
    h += '<div class="srow"><span>개인정보처리방침</span><a class="btn sm" href="privacy.html" target="_blank" rel="noopener">보기</a></div>';
    h += '<div class="srow"><span style="color:var(--bad)">학습 기록 초기화</span><button class="btn sm" data-act="resetall">초기화</button></div>';
    h += '</div><p class="dim small" style="margin-top:14px">디비빅SQL · Oracle 19c 기준 학습 콘텐츠. 실습 DB의 모든 데이터는 학습용 가상 데이터예요. 실무 적용 전 Oracle 공식 문서·MOS로 교차 확인하세요.</p>';
    sheet(h);
  }
  function schemaSheet(t) {
    getEngine().then(function (e) {
      var all = e.tables(), list = t ? all.filter(function (x) { return x.name === t; }) : all;
      var h = '<h2 style="margin-top:4px">' + (t ? esc(t) : "실습 테이블 · 뷰") + '</h2><div class="cbox">';
      list.forEach(function (x) { h += '<div class="card" style="padding:10px 12px"><div class="tn">' + esc(x.name) + ' <span class="dim small" style="font-family:inherit">' + (x.type === "view" ? "VIEW" : "") + '</span></div><div class="cols">' + x.cols.map(function (c) { return esc(c[0]) + ' <span class="dim">' + esc(String(c[1] || "").toLowerCase()) + "</span>"; }).join(" · ") + "</div></div>"; });
      h += "</div>";
      if (t) h += '<button class="btn block" data-act="peek" data-t="' + esc(t) + '" style="margin-top:10px">데이터 미리보기 (5행)</button><div id="peek" style="margin-top:8px"></div>';
      sheet(h);
    }).catch(function () { toast("실습 엔진을 불러오지 못했어요"); });
  }

  /* ───────── 테마 ───────── */
  function applyTheme() {
    var t = S.settings.theme, root = document.documentElement;
    if (t === "auto") t = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    root.dataset.theme = t;
    root.style.setProperty("--fs", S.settings.fs || 1);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "light" ? "#F5F6F8" : "#0E1116";
  }

  /* ───────── 이벤트 ───────── */
  document.addEventListener("pointerdown", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-ins]");
    if (b) { ev.preventDefault(); var ta = $("#ed"); if (ta) { if (document.activeElement !== ta) { ta.focus(); } insertAt(ta, b.dataset.ins); } }
  });
  document.addEventListener("input", function (ev) {
    if (ev.target.id === "glq") { glQuery = ev.target.value || ""; var box = $("#gll"); if (box) box.innerHTML = glossaryList(glQuery); }
  });
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-go],[data-act]"); if (!t) return;
    if (t.dataset.go) { closeSheet(); go(t.dataset.go); return; }
    var a = t.dataset.act;
    if (a === "closesheet") { if (ev.target === t) closeSheet(); return; }
    var acts = {
      settings: settingsSheet,
      quick10: function () { startQuiz(shuffle(ALLQ).slice(0, S.settings.goalQ || 10), "랜덤 퀴즈"); },
      review: function () { startQuiz(shuffle(wrongList()), "오답 복습", { review: true }); },
      weak: function () {
        var sc = function (q) { var r = S.quiz[q.id]; return r ? r.c / (r.c + r.w) : 0.5; };
        startQuiz(shuffle(ALLQ).sort(function (x, y) { return sc(x) - sc(y); }).slice(0, S.settings.goalQ || 10), "약점 집중");
      },
      catquiz: function () { var c = catById(t.dataset.cat); startQuiz(shuffle(c.quiz), c.name + " 퀴즈"); },
      retrywrong: function () { startQuiz(QS.items.filter(function (_, i) { return QS.res[i] && !QS.res[i].ok; }).map(function (x) { return x.q; }), QS.title + " · 다시", { review: QS.review }); },
      pick: function () {
        var it = QS.items[QS.i], q = it.q, o = +t.dataset.o; if (QS.res[QS.i]) return;
        var ok = o === q.a; QS.res[QS.i] = { pick: o, ok: ok };
        if (q.id) {
          var r = S.quiz[q.id] || (S.quiz[q.id] = { c: 0, w: 0 }); if (ok) r.c++; else r.w++;
          if (ok && S.wrong[q.id] && QS.review) delete S.wrong[q.id];
          if (!ok) S.wrong[q.id] = Date.now();
        }
        bump("q"); save();
        $("#main").innerHTML = V.quizrun(); renderTop();
        if (navigator.vibrate && !ok) try { navigator.vibrate(40); } catch (e) {}
      },
      qnext: function () { QS.i++; $("#main").innerHTML = V.quizrun(); window.scrollTo(0, 0); },
      quizai: function () {
        var q = QS.items[QS.i].q, r = QS.res[QS.i];
        aiAsk("너는 Oracle DBA 시니어 엔지니어이자 친절한 튜터야. 한국어로, 지하철에서 폰으로 읽기 좋게 6~10줄 이내로 설명해. 마크다운 제목·표는 쓰지 말고, 명령어나 뷰 이름은 `백틱`으로 감싸. 근거가 불확실하면 그렇다고 말해.\n\n[문제] " + q.q + "\n[보기] " + q.o.map(function (x, i) { return "ABCD"[i] + ". " + x; }).join(" / ") + "\n[정답] " + q.o[q.a] + "\n[학습자 선택] " + q.o[r.pick] + "\n[기본 해설] " + q.e + "\n\n정답의 원리, 오답 보기들이 왜 틀렸는지, 실무에서 이 지식이 쓰이는 상황 하나를 설명해줘.", $("#qai"));
        t.remove();
      },
      aiquiz: function () {
        var c = catById(t.dataset.cat); if (!AI) return;
        t.disabled = true; t.innerHTML = '<span class="spin"></span> 생성 중…';
        AI.json("너는 Oracle 19c DBA 실무 교육 출제자야. 분야: " + c.name + " (" + c.desc + "). 한국 DBA가 현장에서 실제로 마주치는 상황 기반의 4지선다 문제 5개를 한국어로 만들어. 사실관계가 확실한 내용만 출제하고, 버전 의존 내용은 19c 기준으로. 기존 문제와 겹치지 않게: " + c.quiz.map(function (q) { return q.q; }).join(" | ") + "\n\n다음 JSON 형식만 출력: {\"items\":[{\"q\":\"문제\",\"o\":[\"보기1\",\"보기2\",\"보기3\",\"보기4\"],\"a\":정답인덱스(0~3),\"e\":\"해설 2~3문장\"}]}", { modelTier: "default", cache: false })
          .then(function (v) {
            var items = (v && v.items || []).filter(function (x) { return x && x.q && x.o && x.o.length === 4 && x.a >= 0 && x.a < 4 && x.e; }).map(function (x) { return { q: String(x.q), o: x.o.map(String), a: +x.a, e: String(x.e), cat: null }; });
            if (!items.length) throw new Error("empty");
            startQuiz(items, "🤖 AI · " + c.name, { ai: true });
          }).catch(function (e) { t.disabled = false; t.innerHTML = c.icon + " " + esc(c.name); toast(e && e.msg ? e.msg : e && e.code === "rate_limited" ? "요청이 많아요. 잠시 후 다시" : "AI 문제를 만들지 못했어요"); });
      },
      done: function () {
        var l = lessonById(t.dataset.id), c = l.cat, idx = c.lessons.indexOf(l), nx = c.lessons[idx + 1];
        if (!S.lessons[l.id]) { S.lessons[l.id] = Date.now(); bump("l"); save(); toast("✓ " + l.title); }
        go(nx ? "lesson-" + nx.id : "line-" + c.id);
      },
      speak: function () { var l = lessonById(R.arg); if (l) speak(l); },
      lessonai: function () {
        var l = lessonById(R.arg), qv = ($("#lq").value || "").trim(); if (!qv) { toast("질문을 입력해 주세요"); return; }
        var text = l.body.map(function (b) { return b[0] === "code" ? b[2] : b[0] === "ul" ? b[1].join("\n") : b[0] === "tbl" ? b[1].map(function (r) { return r.join(" | "); }).join("\n") : b[1]; }).join("\n");
        if (AIMODE === "handoff") { aiAsk(HANDOFF_PRE + "[공부 중인 레슨: " + l.cat.name + " > " + l.title + "]\n질문: " + qv, $("#lai")); return; }
        aiAsk("너는 Oracle DBA 시니어 엔지니어이자 튜터야. 아래 레슨을 공부하던 학습자의 질문에 한국어로, 폰에서 읽기 좋게 10줄 이내로 답해. 명령어는 `백틱`으로. 확실하지 않으면 그렇다고 말하고 확인할 공식 문서나 MOS 키워드를 알려줘.\n\n[레슨: " + l.title + "]\n" + text.slice(0, 6000) + "\n\n[질문] " + qv, $("#lai"));
      },
      copy: function () { var code = CODES[+t.dataset.i]; try { navigator.clipboard.writeText(code).then(function () { toast("복사했어요"); }, function () { toast("복사 실패 — 길게 눌러 선택하세요"); }); } catch (e) { toast("복사 실패"); } },
      sqlf: function () { sqlFilter = +t.dataset.f; render(); },
      run: function () { runSql("run", R.name === "prob" ? PBYID[R.arg] : null); },
      grade: function () { runSql("grade", PBYID[R.arg]); },
      useans: function () { var p = PBYID[R.arg], ta = $("#ed"); ta.value = formatSql(p.answer); ta.dispatchEvent(new Event("input")); ta.scrollIntoView({ behavior: "smooth", block: "center" }); },
      sqlai: function () {
        var p = PBYID[R.arg], box = $("#res"), sql = $("#ed").value;
        if (AIMODE === "handoff") { aiAsk(HANDOFF_PRE + "SQL 실습 문제를 풀다 막혔어. 정답 SQL을 통째로 주지 말고, 내 SQL에서 무엇이 틀렸는지와 고칠 방향만 짚어줘.\n\n[문제] " + p.q + "\n[사용 테이블] " + p.tables.join(", ") + "\n[내 SQL]\n" + sql + "\n[결과] " + (box.dataset.err ? "에러: " + box.dataset.err : box.dataset.why ? "채점 불일치: " + box.dataset.why : "결과 다름"), $("#sai")); t.remove(); return; }
        aiAsk("너는 Oracle SQL 튜터야. 학습자가 실습 문제를 풀다 막혔어. 한국어로, 폰에서 읽기 좋게 8줄 이내로 코칭해. 정답 SQL 전체를 바로 주지 말고, 무엇이 틀렸는지와 고칠 방향을 구체적으로 짚어줘(필요하면 짧은 코드 조각은 `백틱`으로). 실습 엔진은 SQLite 기반 Oracle 호환 엔진이라 ROWNUM·CONNECT BY·(+) 조인은 미지원이야.\n\n[문제] " + p.q + "\n[사용 테이블] " + p.tables.join(", ") + "\n[행 순서 채점] " + (p.ordered ? "예" : "아니오") + "\n[학습자 SQL]\n" + sql + "\n[실행 결과] " + (box.dataset.err ? "에러: " + box.dataset.err : box.dataset.why ? "채점 불일치: " + box.dataset.why : "결과 다름") + "\n[참고용 모범답안 — 학습자에게 그대로 보여주지 말 것]\n" + p.answer, $("#sai"));
        t.remove();
      },
      schema: function () { schemaSheet(t.dataset.t); },
      peek: function () { getEngine().then(function (e) { try { $("#peek").innerHTML = resultHtml(e.run("SELECT * FROM " + t.dataset.t + " FETCH FIRST 5 ROWS ONLY")); } catch (er) { $("#peek").innerHTML = '<div class="err">' + esc(er.message) + "</div>"; } }); },
      ex: function () { var ta = $("#ed"); ta.value = SANDBOX_EX[+t.dataset.i][1]; ta.dispatchEvent(new Event("input")); runSql("run", null); },
      resetdb: function () { getEngine().then(function (e) { e.reset(); $("#res").innerHTML = '<div class="rmeta">↺ 실습 DB를 처음 상태로 되돌렸어요.</div>'; }); },
      ntab: function () { noteTab = +t.dataset.i; render(); },
      unwrong: function () { delete S.wrong[t.dataset.id]; save(); render(); },
      theme: function () { S.settings.theme = t.dataset.v; save(); applyTheme(); settingsSheet(); },
      fs: function () { S.settings.fs = Math.max(0.85, Math.min(1.3, Math.round(((S.settings.fs || 1) + 0.05 * +t.dataset.d) * 100) / 100)); save(); applyTheme(); settingsSheet(); },
      goal: function () { S.settings.goalQ = +t.dataset.v; save(); settingsSheet(); render(); },
      rate: function () { S.settings.rate = +t.dataset.v; save(); settingsSheet(); },
      abx: function () { S.settings.abx = t.dataset.v === "1"; save(); settingsSheet(); render(); },
      tsend: function () { var ta = $("#tq"); if (ta) tutorSend(ta.value); },
      tchip: function () { var c = TCHIPS[+t.dataset.i]; if (!c) return; if (c[2]) { var ta = $("#tq"); ta.value = c[1] + ta.value; saveDraft("tutor", ta.value); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } else tutorSend(c[1]); },
      tclear: function () { if (!tutor.clear) { tutor.clear = 1; t.textContent = "한 번 더 누르면 지워요"; setTimeout(function () { tutor.clear = 0; }, 3000); return; } if (tutor.busy) return; TU.msgs = []; tutor.clear = 0; tuSave(); render(); },
      tsave: function () { var i = +t.dataset.i, m = TU.msgs[i], q = ""; for (var j = i - 1; j >= 0; j--) if (TU.msgs[j].r === "u") { q = TU.msgs[j].t; break; } if (!m || !m.t) return; S.saved = [{ ts: Date.now(), q: q, a: m.t }].concat(S.saved || []).slice(0, 60); save(); t.textContent = "✓ 저장됨"; t.disabled = true; toast("노트 → 📌 AI에 저장했어요"); },
      tcopy: function () { var m = TU.msgs[+t.dataset.i]; if (!m) return; try { navigator.clipboard.writeText(m.t).then(function () { toast("복사했어요"); }, function () { toast("복사 실패"); }); } catch (e) { toast("복사 실패"); } },
      unsave: function () { var ts = +t.dataset.ts; S.saved = (S.saved || []).filter(function (x) { return x.ts !== ts; }); save(); render(); },
      setkey: function () { sheet('<h2>Claude API 키 (선택·유료)</h2><p class="small muted"><b>없어도 AI 튜터는 쓸 수 있어요</b>(Claude로 넘겨서 내 계정으로 무료 질문). 키를 넣으면 앱 안에서 바로 답을 받지만, Claude 구독과 별도로 API 사용료가 나가요. 키는 이 폰(브라우저)에만 저장돼요. GitHub에 올라가지 않고 학습 기록 백업에도 들어가지 않아요. AI에게 질문할 때만 Anthropic API로 직접 전송돼요.</p><input id="akey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-..." style="width:100%;height:44px;border-radius:10px;border:1px solid var(--line2);background:var(--card2);padding:0 12px;font:14px var(--mono);color:var(--tx)"><div class="grid2" style="margin-top:10px"><button class="btn pri" data-act="savekey">저장</button>' + (apiKey() ? '<button class="btn" data-act="delkey">키 삭제</button>' : '<button class="btn" data-act="keyhelp">발급 방법</button>') + "</div>"); },
      savekey: function () { var v = ($("#akey").value || "").trim(); if (!/^sk-ant-/.test(v)) { toast("sk-ant- 로 시작하는 키를 넣어 주세요"); return; } try { localStorage.setItem(AKEY, v); } catch (e) {} useApiAI(); closeSheet(); render(); toast("키를 저장했어요 · ⚙️에서 테스트해 보세요"); },
      delkey: function () { try { localStorage.removeItem(AKEY); } catch (e) {} useApiAI(); closeSheet(); render(); toast("키를 지웠어요"); },
      aimodel: function () { S.settings.aiModel = t.dataset.v; save(); settingsSheet(); },
      aitest: function () { t.disabled = true; t.textContent = "확인 중…"; apiCall([{ role: "user", content: "연결 테스트입니다. '연결 성공'이라고만 답하세요." }], { maxTokens: 300 }).then(function () { toast("✓ 연결 성공 · " + apiModel()[1]); }, function (e) { toast(aiFail(e)); }).then(function () { if ($("#layer").innerHTML) settingsSheet(); }); },
      keyhelp: function () { sheet(KEYHELP); },
      export: function () { var txt = JSON.stringify(S); try { navigator.clipboard.writeText(txt).then(function () { toast("학습 기록을 복사했어요. 메모장 등에 보관하세요."); }, function () { sheet('<h2>학습 기록</h2><p class="small muted">아래 내용을 길게 눌러 복사하세요.</p><textarea readonly style="width:100%;height:200px;font:11px var(--mono);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px">' + esc(txt) + "</textarea>"); }); } catch (e) {} },
      import: function () { sheet('<h2>학습 기록 붙여넣기</h2><p class="small muted">백업해 둔 내용을 붙여넣으면 지금 기록과 합쳐져요.</p><textarea id="imp" style="width:100%;height:160px;font:11px var(--mono);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px"></textarea><button class="btn pri block" data-act="doimport" style="margin-top:10px">합치기</button>'); },
      doimport: function () { try { var o = normalize(JSON.parse($("#imp").value)); if (!o.updatedAt) throw 0; S = merge(S, o); save(); closeSheet(); render(); toast("기록을 합쳤어요"); } catch (e) { toast("올바른 백업 내용이 아니에요"); } },
      resetall: function () { sheet('<h2>정말 초기화할까요?</h2><p class="muted">레슨 완료, 퀴즈 기록, 오답노트, SQL 해결 기록이 모두 지워져요. 되돌릴 수 없어요.</p><div class="grid2"><button class="btn" data-act="closesheet2">취소</button><button class="btn" style="background:var(--bad);border-color:var(--bad);color:#fff" data-act="doreset">초기화</button></div>'); },
      closesheet2: closeSheet,
      changelog: function () {
        sheet('<h2 style="margin-top:4px">업데이트 내역</h2>' + CHANGELOG.map(function (c) { return '<div class="card" style="margin-bottom:10px"><div class="row"><b style="font-family:var(--mono)">v' + c.v + '</b>' + (c.v === VERSION ? '<span class="pill" style="color:var(--ok);border-color:rgba(47,191,113,.4)">현재</span>' : "") + '<span class="dim small" style="margin-left:auto">' + c.d + '</span></div><ul class="small" style="margin:8px 0 0;padding-left:18px">' + c.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"; }).join(""));
      },
      doreset: function () { var keep = S.settings; S = blank(); S.settings = keep; save(); closeSheet(); go("home"); toast("초기화했어요"); }
    };
    if (acts[a]) { ev.preventDefault(); acts[a](); }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.target.id === "tq" && (ev.ctrlKey || ev.metaKey) && ev.key === "Enter") { ev.preventDefault(); tutorSend(ev.target.value); return; }
    if (ev.target.id === "ed" && (ev.ctrlKey || ev.metaKey) && ev.key === "Enter") { ev.preventDefault(); if (R.name === "prob") runSql("grade", PBYID[R.arg]); else runSql("run", null); }
    if (ev.target.id === "ed" && ev.key === "Tab") { ev.preventDefault(); insertAt(ev.target, "⇥"); }
    if (ev.target.id === "lq" && ev.key === "Enter") { var b = document.querySelector('[data-act="lessonai"]'); if (b) b.click(); }
  });
  window.addEventListener("scroll", function () { var t = $("#top"); if (t) t.classList.toggle("scrolled", window.scrollY > 4); }, { passive: true });
  if (window.matchMedia) try { window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", applyTheme); } catch (e) {}

  if (!(window.claude && window.claude.use)) useApiAI();   // 설치형: 저장된 API 키가 있으면 첫 화면부터 AI 사용
  render();
  if (S.settings.seenVer !== VERSION) {
    var isUpdate = !!S.updatedAt;
    S.settings.seenVer = VERSION;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    if (isUpdate) setTimeout(function () { toast("v" + VERSION + " 업데이트 · 설정 ⚙️에서 내역 확인"); }, 600);
  }
  initCloud();
  initCaps();
  // SQL 엔진은 첫 화면 후 미리 데워둠
  setTimeout(function () { getEngine().catch(function () {}); }, 1500);
})();
