"""
Master build script to compile all 4 Enterprise ERP Documentation PDFs:
1. Krishna_Engineering_Works_ERP_Complete_User_Manual.pdf
2. Krishna_ERP_Role_Wise_Quick_Guides.pdf
3. Krishna_ERP_Module_and_Permission_Matrix.pdf
4. Krishna_ERP_Documentation_Audit.pdf
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))

from generate_main_manual import build_manual
from generate_quick_guides import build_quick_guides
from generate_permission_matrix import build_permission_matrix
from generate_doc_audit import build_doc_audit


def main():
    print("=" * 70)
    print("KRISHNA ENGINEERING WORKS ERP — DOCUMENTATION COMPILATION SUITE")
    print("=" * 70)
    t0 = time.time()

    print("\n[1/4] Generating Complete ERP Software User Manual...")
    build_manual()

    print("\n[2/4] Generating Role-Wise Quick Reference Guides & SOPs...")
    build_quick_guides()

    print("\n[3/4] Generating Module & Permission Matrix (RBAC)...")
    build_permission_matrix()

    print("\n[4/4] Generating Codebase & Documentation Audit Report...")
    build_doc_audit()

    elapsed = time.time() - t0
    print("\n" + "=" * 70)
    print(f"ALL 4 ENTERPRISE MANUALS COMPILED SUCCESSFULLY IN {elapsed:.2f}s!")
    print("=" * 70)


if __name__ == "__main__":
    main()
